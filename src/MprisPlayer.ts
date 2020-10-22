import { ProxyObject } from 'dbus-next';
import { PlayerInfo } from './PlayerInfo';

export interface MprisPlayer {
  friendlyName: string;
  largeImageId: string;
  getPlaying(): Promise<PlayerInfo>;
}