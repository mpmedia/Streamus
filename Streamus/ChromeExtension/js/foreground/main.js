require(['jquery',
        'jqueryUi',
        'backbone',
        'jqueryMousewheel',
        'playerStates',
        'helpers',
        'underscore',
        'oauth2'
    ], function () {
    'use strict';

    //  TODO: Would like to access through define module, but not sure how..
    var loginManager = chrome.extension.getBackgroundPage().LoginManager;
    var player = chrome.extension.getBackgroundPage().YoutubePlayer;
        
    //  If the foreground is opened before the background has had a chance to load, wait for the background.
    //  This is easier than having every control on the foreground guard against the background not existing.
    loginManager.onLoggedIn(loadForeground);

    function loadForeground() {
        player.onReady(function () {
            //  Load foreground when the background indicates it has loaded.
            require(['foreground']);
        });
    }
});