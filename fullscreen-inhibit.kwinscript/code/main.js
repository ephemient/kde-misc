var INHIBITING = 1, INHIBITED = 2, UNINHIBITING = -1;

var clientStates = {};
var inhibitionCookies = {};

function handleClientEnterFullScreenState(client) {
    var windowId = client.windowId;
    var oldState = clientStates[windowId];
    if (oldState > 0) {
        return;
    }
    clientStates[windowId] = INHIBITING;
    print('Want to inhibit ' + windowId);
    if (oldState) {
        return;
    }
    print('Inhibiting ' + windowId);
    callDBus(
            'org.freedesktop.ScreenSaver',
            '/org/freedesktop/ScreenSaver',
            'org.freedesktop.ScreenSaver.Inhibit',
            client.caption, 'fullscreen', function(cookie) {
        print('Inhibited ' + windowId + ' -> ' + cookie);
        inhibitionCookies[windowId] = cookie;
        if (clientStates[windowId] > 0) {
            clientStates[windowId] = INHIBITED;
        } else {
            handleClientExitFullScreenState(workspace.getClient(windowId));
        }
    });
}

function handleClientExitFullScreenState(client) {
    var windowId = client.windowId;
    var oldState = clientStates[windowId];
    if (!(oldState > 0)) {
        return;
    }
    print('Want to uninhibit ' + windowId);
    clientStates[windowId] = UNINHIBITING;
    if (oldState != INHIBITED) {
        return;
    }
    clientStates[windowId] = UNINHIBITING;
    if (windowId in inhibitionCookies) {
        print('Uninhibiting ' + windowId + ' <- ' + inhibitionCookies[windowId]);
        callDBus(
                'org.freedesktop.ScreenSaver',
                '/org/freedesktop/ScreenSaver',
                'org.freedesktop.ScreenSaver.UnInhibit',
                inhibitionCookies[windowId], function() {
            print('Uninhibited ' + windowId);
            delete inhibitionCookies[windowId];
            if (clientStates[windowId] > 0) {
                handleClientEnterFullScreenState(workspace.getClient(windowId));
            } else {
                delete clientStates[windowId];
            }
        });
    } else {
        print('Uninhibited ' + windowId);
        delete inhibitionCookies[windowId];
        delete clientStates[windowId];
    }
}

function handleClientState(client) {
    if (client.fullScreen) {
        handleClientEnterFullScreenState(client);
    } else {
        handleClientExitFullScreenState(client);
    }
}

function handleClient(client) {
    client.fullScreenChanged.connect(function() {
        handleClientState(this);
    });
    handleClientState(client);
}

workspace.clientRemoved.connect(handleClientExitFullScreenState);
workspace.clientAdded.connect(handleClient);
Array.prototype.forEach.call(workspace.clientList(), function(client) {
    handleClient(client);
});
