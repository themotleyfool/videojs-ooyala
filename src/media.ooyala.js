/**
 * @fileoverview Ooyala Media Controller - Wrapper for Ooyala Media API
 * Ported from https://github.com/eXon/videojs-youtube/
 */

/**
 * Ooyala Media Controller - Wrapper for YouTube Media API
 * @param {videojs.Player|Object} player
 * @param {Object=} options
 * @param {Function=} ready
 * @constructor
 */
videojs.Ooyala = videojs.MediaTechController.extend({
  /** @constructor */
  init: function(player, options, ready){
    videojs.MediaTechController.call(this, player, options, ready);

    // Copy the JavaScript options if they exists
    if (typeof options['source'] != 'undefined') {
      for (var key in options['source']) {
        player.options()[key] = options['source'][key];
      }
    }

    // Save those for internal usage
    this.player_ = player;
    this.player_el_ = document.getElementById(player.id());
    this.player_el_.className += ' vjs-ooyala';

    var self = this;
    this.id_ = this.player_.id() + '_ooyala_api';

    this.el_ = videojs.Component.prototype.createEl('iframe', {
      id: this.id_,
      className: 'vjs-tech',
      scrolling: 'no',
      marginWidth: 0,
      marginHeight: 0,
      frameBorder: 0,
      webkitAllowFullScreen: 'true',
      mozallowfullscreen: 'true',
      allowFullScreen: 'true'
    });

    // This makes sure the mousemove is not lost within the iframe
    // Only way to make sure the control bar shows when we come back in the video player
    this.iframeblocker = videojs.Component.prototype.createEl('div', {
      className: 'iframeblocker'
    });

    // Make sure to not block the play or pause
    var self = this;
    var toggleThis = function() {
      if (self.paused()) {
        self.play();
      } else {
        self.pause();
      }
    };

    if (this.iframeblocker.addEventListener) {
      this.iframeblocker.addEventListener('click', toggleThis);
    } else {
      this.iframeblocker.attachEvent('onclick', toggleThis);
    }

    this.player_el_.insertBefore(this.iframeblocker, this.player_el_.firstChild);
    this.player_el_.insertBefore(this.el_, this.iframeblocker);

    this.contentId = player.options()['contentId'];

    if (videojs.Ooyala.apiReady){
      videojs.Ooyala.loadOoyala(this.player_el_.id, this.videoId);
    } else {
      function loadExtScript(src, test, callback) {
        var tag = document.createElement('script');
        tag.src = src;

        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        var callbackTimer = setInterval(function() {
          var call = false;

          try {
            call = test.call();
          } catch (e) {}

          if (call) {
            clearInterval(callbackTimer);
            callback.call();
          }
        }, 100);
      }

      var playerId = player.options()['playerId'];
      var src = '//player.ooyala.com/v3/' + playerId + '?platform=html5-priority';

      // If we are not on a server, don't specify the origin (it will crash)
      if (window.location.protocol == 'file:'){
        src = 'http:' + src;
      }

      loadExtScript(src, function() {
        return OO;
      }, function() {
        videojs.Ooyala.loadOoyala(this.player_el_.id, this.contentId);
      }.bind(this));
    }
  }
});

videojs.Ooyala.prototype.dispose = function(){
  videojs.MediaTechController.prototype.dispose.call(this);
};

videojs.Ooyala.prototype.load = function(){};
videojs.Ooyala.prototype.play = function(){};
videojs.Ooyala.prototype.pause = function(){};
videojs.Ooyala.prototype.paused = function(){};
videojs.Ooyala.prototype.currentTime = function(){};
videojs.Ooyala.prototype.setCurrentTime = function(seconds){};
videojs.Ooyala.prototype.duration = function(){};
videojs.Ooyala.prototype.volume = function(){};
videojs.Ooyala.prototype.setVolume = function(percentAsDecimal){};
videojs.Ooyala.prototype.muted = function(){};
videojs.Ooyala.prototype.setMuted = function(muted){};
videojs.Ooyala.prototype.buffered = function(){};
videojs.Ooyala.prototype.supportsFullScreen = function(){ return true; };

// Ooyala is supported on all platforms
videojs.Ooyala.isSupported = function(){ return true; };

// You can use video/ooyala as a media in your HTML5 video to specify the source
videojs.Ooyala.canPlaySource = function(srcObj){
  return (srcObj.type == 'video/ooyala');
};

// Always can control the volume
videojs.Ooyala.canControlVolume = function(){ return true; };

////////////////////////////// Ooyala specific functions //////////////////////////////

videojs.Ooyala.loadOoyala = function(player, videoId){
  this.ooPlayer = {};

  OO.ready(function() {
    this.ooPlayer = OO.Player.create(player, videoId, {
      onCreate: function(player) {
        player.subscribe('*', 'vjs-ooyala', function(eventName) {
          // Player embedded parameters go here
        });

        // Error handling listener
        player.subscribe("error", "vjs-ooyala", function(eventName, payload) {
          console.log(eventName + ": " + payload);
        });

        // Buffer listener
        // Need to subscribe to an event if you want updates for the length of the buffer.
        // Ideally you'd listen for the BUFFERING event.
        // window.bufferLength = -100;
        // player.subscribe('playheadTimeChanged', 'myPage', function(eventName) {
        //   var newBufferLength = player.getBufferLength();
        //   if (bufferLength === newBufferLength) { return; }
        //   window.bufferElement.innerHTML += "Buffer length is " + player.getBufferLength() + "<br/>"
        //   window.bufferLength = newBufferLength;
        // });

        // Bitrate listener
        // You *must* listen to bitrateInfoAvailable in order to request it.
        // player.subscribe('bitrateInfoAvailable', 'myPage', function(eventName) {
        //   var rates = player.getBitratesAvailable();
        //   if (rates.length > 0) {
        //     for (var i=0; i < rates.length; i++) {
        //       window.bitrateElement.innerHTML += "Rate: " + rates[i] + "<br/>"
        //     }
        //   }
        // });

        player.subscribe('playbackReady', 'vjs-ooyala', function(eventName) {
          // console.log("Title is: " + player.getTitle());
          // console.log("Description is: " + player.getDescription());
          // console.log("Duration is: " + player.getDuration());

          this.apiReady = true;
        });
      },
      autoplay: true,
      wmode: 'opaque',
    });
  });
}

videojs.Ooyala.prototype.onError = function(error){
  this.player_.error = error;
  this.player_.trigger('error');
};