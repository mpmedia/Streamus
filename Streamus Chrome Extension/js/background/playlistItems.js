﻿define(['playlistItem', 'ytHelper', 'video', 'levenshtein', 'programState'],
    function (PlaylistItem, ytHelper, Video, levDistance, programState) {
        'use strict';

    var playlistItemsCollection = Backbone.Collection.extend({
        model: PlaylistItem,
        
        //  I've given this Collection its own Save implementation because when I add/delete from a Playlist
        //  I have to save up to 3 items.   
        save: function (attributes, options) {
            var self = this;
            $.ajax({
                url: programState.getBaseUrl() + 'PlaylistItem/UpdateMultiple',
                type: 'PUT',
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
                data: JSON.stringify(self),
                success: options ? options.success : null,
                error: options ? options.error : null
            });
        },

        getRelatedVideos: function() {
            //  Take each playlist item's array of related videos, pluck them all out into a collection of arrays
            //  then flatten the arrays into a collection of videos.

            var relatedVideos = _.flatten(this.map(function (item) {
                var videoInformationList = item.get('relatedVideoInformation');

                return _.map(videoInformationList, function(videoInformation) {
                    //  Strip out the id. An example of $t's contents: tag:youtube.com,2008:video:UwHQp8WWMlg
                    var id = videoInformation.media$group.yt$videoid.$t;
                    var durationInSeconds = parseInt(videoInformation.media$group.yt$duration.seconds, 10);

                    //  Don't forget to set the playlistId after adding a related video to a playlist later.
                    var video = new Video({
                        id: id,
                        title: videoInformation.title.$t,
                        duration: durationInSeconds
                    });

                    return video;
                });

            }));

            //  Don't add any videos that are already in playlist.
            var self = this;
            relatedVideos = _.filter(relatedVideos, function (relatedVideo) {
                var alreadyExistingItem = self.find(function (item) {
                    var sameVideoId = item.get('video').get('id') === relatedVideo.get('id');
                    var similiarVideoName = levDistance(item.get('video').get('title'), relatedVideo.get('title')) < 3;

                    return sameVideoId || similiarVideoName;
                });

                return alreadyExistingItem == null;
            });
            
            // Try to filter out 'playlist' songs, but if they all get filtered out then back out of this assumption.
            var tempFilteredRelatedVideos = _.filter(relatedVideos, function(relatedVideo) {
                //  assuming things >8m are playlists.
                var isJustOneSong = relatedVideo.get('duration') < 480;
                var isNotLive = relatedVideo.get('title').toLowerCase().indexOf('live') === -1;
                
                return isJustOneSong && isNotLive;
            });
            
            if (tempFilteredRelatedVideos.length !== 0) {
                relatedVideos = tempFilteredRelatedVideos;
            }

            return relatedVideos;
        }
    });

    //  Public exposure of a constructor for building new PlaylistItem objects.
    return function(config) {
        var playlistItems = new playlistItemsCollection(config);

        //  TODO: Can I move this to an initialize?
        playlistItems.each(function(item) {
            //  Fetch all the related videos for videos on load. I don't want to save these to the DB because they're bulky and constantly change.
            //  Data won't appear immediately as it is an async request, I just want to get the process started now.

            ytHelper.getRelatedVideoInformation(item.get('video').get('id'), function(relatedVideoInformation) {
                item.set('relatedVideoInformation', relatedVideoInformation);
            });
        });

        return playlistItems;
    };
});