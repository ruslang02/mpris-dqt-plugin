import DBus, { ProxyObject, ClientInterface, DBusError, MessageBus, Message } from 'dbus-next';
import { APP_ID, MPRIS_PATH } from './Constants';
import { MprisPlayer } from './MprisPlayer';
import { getString, getNumber, ms2str } from './MprisUtilities';
import { PlayerInfo } from './PlayerInfo';

const players: Map<string, new (mpris: ProxyObject) => MprisPlayer> = new Map([
  ['org.mpris.MediaPlayer2.clementine', require('./players/clementine')]
])

export class MprisClient {
  private bus?: MessageBus;
  private mpris?: ProxyObject;

  private app: any;

  private logger: any;

  private currentPlayer?: MprisPlayer;

  private playerList: string[] = [];

  constructor({ app, createLogger }: { app: any, createLogger: any }) {
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

      logger.log('Init complete.')
    } catch (e) {
      logger.error(`DBus couldn't connect. Music Rich Presence inactive.`, e);
    }
  }

  private async initPlayer(playerId: string) {
    try {
      const Player = players.get(playerId);
      if (!Player) return;
      this.logger.log('Loading player', Player);
      this.mpris = await (this.bus as MessageBus).getProxyObject(playerId, MPRIS_PATH);
      this.currentPlayer = new Player(this.mpris);
    } catch (e) {
      this.logger.error(`Couldn't connect to ${playerId}, Music Rich Presence inactive.`, e);
    }
  }

  private async listPlayers() {
    const listNamesCall = new Message({
      destination: 'org.freedesktop.DBus',
      path: '/org/freedesktop/DBus',
      interface: 'org.freedesktop.DBus',
      member: 'ListNames'
    });
    const reply = await this.bus?.call(listNamesCall);
    if (!reply || !reply.body.length) return;
    this.playerList = (reply.body[0] as string[]).filter(name => name.includes('org.mpris.MediaPlayer2'));
    this.logger.debug('Found players', this.playerList, reply.body);
    const player = this.playerList.find(name => !!players.get(name));
    if (!player) return;
    this.initPlayer(player)
  }

  private async updatePresence() {
    const { app, logger } = this;
    if ( !this.currentPlayer) return;
    const player = await this.currentPlayer.getPlaying();
    logger.debug(`Currently playing ${player.title} from ${player.artist}, ${ms2str(player.current)} / ${ms2str(player.duration)}`);

    app.client?.user?.setPresence({
      activity: player.state === 'Paused' ? undefined : {
        name: this.currentPlayer.friendlyName,
        state: player.artist,
        details: player.title,
        application: APP_ID,
        assets: {
          largeImage: this.currentPlayer.largeImageId,
          largeText: player.album,
          smallImage: 'playing',
          smallText: `${ms2str(player.current)} / ${ms2str(player.duration)}`
        },
        timestamps: {
          start: new Date().getTime() - player.current,
          end: new Date().getTime() - player.duration
        },
        type: 2,
      }
    })
  }

  destroy() {
    this.bus?.disconnect();
  }
}

module.exports = MprisClient;