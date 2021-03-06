import { Component } from '@angular/core';
import { NgZone } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { NavController, NavParams, ViewController } from 'ionic-angular';
import { PairingPage } from '../pairing/pairing';
import { AlertController } from 'ionic-angular';
import { ToastController } from 'ionic-angular';
import { Platform } from 'ionic-angular';
import { NabtoService } from '../../app/nabto.service';
import { NabtoDevice } from '../../app/device.class';
import { Bookmark, BookmarksService } from '../../app/bookmarks.service';
import { VendorHeatingPage } from '../vendor-heating/vendor-heating';

@Component({
  selector: 'page-discover',
  templateUrl: 'discover.html'
})
export class DiscoverPage {
  empty: boolean;
  busy: boolean;
  longTitle: string;
  shortTitle: string;
  view : ViewController;
  
  public devices: Observable<NabtoDevice[]>;
  private recentIds: string[];

  ionViewDidEnter() {
    this.view = this.navCtrl.getActive();
    this.refresh();
  }
  
  constructor(public navCtrl: NavController,
              public navParams: NavParams,
              public toastCtrl: ToastController,
              private alertCtrl: AlertController,
              public platform: Platform,
              private nabtoService: NabtoService,
              private bookmarksService: BookmarksService,
              private zone: NgZone
             ) {
    this.longTitle = navParams.get('longTitle');
    if (!this.longTitle) {
      this.longTitle = "Discover local devices";
    }
    this.shortTitle = navParams.get('shortTitle');
    if (!this.shortTitle) {
      this.shortTitle = "Discover";
    }
    document.addEventListener('resume', () => {
      this.onResume();
    });
  }
  
  onResume() {
    // Will only prepare devices if this page is the active view after resume
    if (this.navCtrl.getActive() == this.view) {
      this.nabtoService.prepareInvoke(this.recentIds);
    }
  }

  refresh() {
    this.busy = true;
    this.nabtoService.discover().then((ids: string[]) => {
      this.busy = false;
      this.empty = ids.length == 0;
      this.nabtoService.prepareInvoke(ids).then(() => {
        // listview observes this.devices and will be populated as data is received 
        this.devices = this.nabtoService.getPublicInfo(ids.map((id) => new Bookmark(id)));
        this.devices.subscribe((next) => {
          console.log("Got device for discover: " + JSON.stringify(next));
        });
        this.recentIds = ids;
      });
    }).catch((error) => {
      this.showToast(error.message);
      console.error("Error discovering devices: " + JSON.stringify(error));
      this.empty = true;
      this.busy = false;
    });
  }

  showToast(message: string) {
    let toast = this.toastCtrl.create({
      message: message,
      showCloseButton: true,
      closeButtonText: 'Ok',
      duration: 3000
    });
    toast.present();
  }
  
  itemTapped(event, device) {
    if (device.openForPairing) {
      if (device.currentUserIsOwner) {
        this.handleAlreadyPairedDevice(device);
      } else {
        this.handleUnpairedDevice(device);
      }
    } else {
      if (device.currentUserIsOwner) {
        this.handleAlreadyPairedDevice(device);
      } else {
        this.handleClosedDevice();
      }
    }
  }

  handleAlreadyPairedDevice(device: NabtoDevice) {
    let toast = this.toastCtrl.create({
      message: "Already paired",
      duration: 1000,
      showCloseButton: false
    });
    toast.present();
    // if the user has deleted bookmark, add again
    this.bookmarksService.addBookmarkFromDevice(device);
    this.navCtrl.push(VendorHeatingPage, { // XXX don't depend directly on vendor page here
      device: device
    });
  }

  handleUnpairedDevice(device: NabtoDevice) {
    this.navCtrl.push(PairingPage, {
      device: device,
      shortTitle: "Pair device",
      longTitle: "Pair local device"
    });
  }
  
  handleClosedDevice() {
    let alert = this.alertCtrl.create({
      title: 'Device not open',
      message: "Sorry! This device is not open for pairing, please contact the device owner. Or perform a factory reset if you are the owner of the device but don't have access.",
      enableBackdropDismiss: false,
      buttons: [
        {
          text: 'Ok',
        }
      ]
    });
    alert.present();
  }

  home() {
    this.navCtrl.popToRoot();
  }
  
}

