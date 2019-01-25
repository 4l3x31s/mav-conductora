import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import {Subscription} from 'rxjs';
import {Platform} from '@ionic/angular';
import {filter} from 'rxjs/operators';
import {Socket} from 'ngx-socket-io';

declare var google;
// Error de SocketIO
// (window as any).global = window;
// en polyfills.ts

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  public nickname = Date.now();
  public messages = [];
  public message = '';
  @ViewChild('map') mapElement: ElementRef;
  map: any;
  currentMapTrack = null;

  isTracking = false;
  trackedRoute = [];
  previousTracks = [];

  positionSubscription: Subscription;
  constructor (
      private geolocation: Geolocation,
      private plt: Platform,
      private socket: Socket) {
  }
  ngOnInit(): void {
    this.plt.ready().then(() => {

      const mapOptions = {
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      };
      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

      this.geolocation.getCurrentPosition().then(pos => {
        const latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        this.map.setCenter(latLng);
        this.map.setZoom(16);
      }).catch((error) => {
        console.log('Error getting location', error);
      });
    });
  }

  startTracking() {
    this.isTracking = true;
    this.trackedRoute = [];

    this.positionSubscription = this.geolocation.watchPosition()
        .pipe(
            filter((p) => p.coords !== undefined) // Filter Out Errors
        )
        .subscribe(data => {
          setTimeout(() => {
            this.trackedRoute.push({ lat: data.coords.latitude, lng: data.coords.longitude });
            this.sendMessage({ de: this.nickname, lat: data.coords.latitude, lng: data.coords.longitude });
            this.redrawPath(this.trackedRoute);
          }, 0);
        });

  }
  sendMessage(data: object) {
    this.socket.emit('send-location', { data });
    this.message = '';
  }

  redrawPath(path) {
    if (this.currentMapTrack) {
      this.currentMapTrack.setMap(null);
    }
    const pinIcon = {
      url: 'assets/imgs/gps.png',
      scaledSize: new google.maps.Size(25, 25)
    };
    if (path.length > 0) {
      this.currentMapTrack = new google.maps.Marker({
        position: path[path.length - 1],
        map: this.map,
        title: 'Hello World!',
        icon: pinIcon
      });
      this.currentMapTrack.setMap(this.map);
    }
  }
  stopTracking() {
    const newRoute = { finished: new Date().getTime(), path: this.trackedRoute };
    this.previousTracks.push(newRoute);

    this.isTracking = false;
    this.positionSubscription.unsubscribe();
    this.currentMapTrack.setMap(null);
  }

  showHistoryRoute(route) {
    this.redrawPath(route);
  }

}
