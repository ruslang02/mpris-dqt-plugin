import { ClientInterface, ProxyObject } from 'dbus-next';
import { MPRIS_IFACE, PROPERTIES_IFACE } from '../Constants';
import { MprisPlayer } from '../MprisPlayer';
import { getString, getNumber } from '../MprisUtilities';
import { PlayerInfo } from '../PlayerInfo';

class ClementinePlayer implements MprisPlayer {
  readonly friendlyName = 'Clementine';

  readonly largeImageId = 'clementine';

  private props: ClientInterface;

  constructor(mpris: ProxyObject) {
    this.props = mpris.getInterface(PROPERTIES_IFACE);
  }


  async getPlaying(): Promise<PlayerInfo> {
    const { props } = this;
    const metadata = await props?.Get(MPRIS_IFACE, 'Metadata');
    const position = await props?.Get(MPRIS_IFACE, 'Position');
    const state = await props?.Get(MPRIS_IFACE, 'PlaybackStatus');
    return {
      title: getString(metadata, 'xesam:title') || 'No title',
      artist: getString(metadata, 'xesam:artist') || 'No artist',
      album: getString(metadata, 'xesam:album'),
      duration: getNumber(metadata, 'mpris:length') / 1000,
      current: getNumber(position) / 1000,
      art: getString(metadata, 'mpris:artUrl'),
      id: getString(metadata, 'mpris:trackid'),
      state: getString(state),
      bitrate: getNumber(metadata, 'bitrate'),
    };
  }
}

module.exports = ClementinePlayer;