import DBus, { Message, MessageBus, ProxyObject } from 'dbus-next';
import { APP_ID, MPRIS_PATH } from './Constants';
import { MprisPlayer } from './MprisPlayer';
import { ms2str } from './MprisUtilities';

const players: Map<string, string> = new Map([
  ['org.mpris.MediaPlayer2.clementine', 'Clementine'],
  ['org.mpris.MediaPlayer2.vlc', 'VLC'],
  ['generic', 'Music'],
] as const);

export class MprisClient {
  private bus?: MessageBus;

  private mpris?: ProxyObject;

  private app: any;

  private logger: any;

  private player?: MprisPlayer;

  private playerName?: string;

  private playerList: string[] = [];

  constructor({ app, createLogger }: { app: any; createLogger: any }) {
    this.app = app;
    this.logger = createLogger('MprisPlugin');

    this.initBus();
    this.listPlayers();
    setInterval(this.updatePresence.bind(this), 4000);
  }

  private async initBus(): Promise<void> {
    const { logger } = this;
    try {
      this.bus = DBus.sessionBus();

      logger.log('Init complete.');
    } catch (e) {
      logger.error(`DBus couldn't connect. Music Rich Presence inactive.`, e);
    }
  }

  private async initPlayer(playerName: string) {
    try {
      this.mpris = await (this.bus as MessageBus).getProxyObject(
        playerName,
        MPRIS_PATH
      );
      this.playerName = playerName;
      this.player = new MprisPlayer(this.mpris);
    } catch (e) {
      this.logger.error(
        `Couldn't connect to ${playerName}, Music Rich Presence inactive.`,
        e
      );
    }
  }

  private async listPlayers() {
    const listNamesCall = new Message({
      destination: 'org.freedesktop.DBus',
      path: '/org/freedesktop/DBus',
      interface: 'org.freedesktop.DBus',
      member: 'ListNames',
    });
    const reply = await this.bus?.call(listNamesCall);
    if (!reply || !reply.body.length) return;
    this.playerList = (reply.body[0] as string[]).filter((name) =>
      name.includes('org.mpris.MediaPlayer2')
    );
    this.logger.debug('Found players', this.playerList);

    const player = this.playerList.find((name) => !!players.get(name));

    if (player || this.playerList.length) {
      this.initPlayer(player || this.playerList[0]);
    }
  }

  private async updatePresence() {
    const { app, logger } = this;
    if (!this.player || !this.playerName) return;
    try {
      const player = await this.player.getPlaying();
      logger.debug(
        `Currently playing ${player.title} from ${player.artist}, ${ms2str(
          player.current
        )} / ${ms2str(player.duration)}`
      );

      const name = players.get(this.playerName);

      app.client?.user?.setPresence({
        activity:
          player.state === 'Paused'
            ? undefined
            : {
                name,
                state: player.artist,
                details: player.title,
                application: APP_ID,
                assets: {
                  largeImage: this.playerName.toLowerCase(),
                  largeText: player.album,
                  smallImage: 'playing',
                  smallText: `${ms2str(player.current)} / ${ms2str(
                    player.duration
                  )}`,
                },
                timestamps: {
                  start: new Date().getTime() - player.current,
                  end: new Date().getTime() - player.duration,
                },
                type: 2,
              },
      });
    } catch (e) {
      console.error(e);
      this.listPlayers();
    }
  }

  destroy() {
    this.bus?.disconnect();
  }
}

module.exports = MprisClient;
