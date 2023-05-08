const CLIENT_ID = encodeURIComponent('3e37c8057e3e4489b284568802e1695f');
const RESPONSE_TYPE = encodeURIComponent('token');
const REDIRECT_URI = encodeURIComponent('https://mecdlkhjjhfoedmmalhbomfdgeehgejj.chromiumapp.org/');
const SCOPE = encodeURIComponent('playlist-modify-public playlist-modify-private playlist-read-collaborative playlist-read-private');
const SHOW_DIALOG = encodeURIComponent('true');
let STATE = '';
let ACCESS_TOKEN = '';

let user_signed_in = false;

function create_spotify_endpoint() {
    STATE = encodeURIComponent('meet' + Math.random().toString(36).substring(2, 15));

    let oauth2_url =
        `https://accounts.spotify.com/authorize
?client_id=${CLIENT_ID}
&response_type=${RESPONSE_TYPE}
&redirect_uri=${REDIRECT_URI}
&state=${STATE}
&scope=${SCOPE}
&show_dialog=${SHOW_DIALOG}
`;

    console.log(oauth2_url);

    return oauth2_url;
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'login') {
        if (user_signed_in) {
            console.log("User is already signed in.");
        } else {
            chrome.identity.launchWebAuthFlow({
                url: create_spotify_endpoint(), 
                interactive: true
            }, 
            function (redirect_url) {
                if (chrome.runtime.lastError) {
                    sendResponse({ message: 'fail' });
                } else {
                    if (redirect_url.includes('callback?error=access_denied')) {
                        sendResponse({ message: 'fail' });
                    } else {
                        ACCESS_TOKEN = redirect_url.substring(redirect_url.indexOf('access_token=') + 13);
                        ACCESS_TOKEN = ACCESS_TOKEN.substring(0, ACCESS_TOKEN.indexOf('&'));
                        let state = redirect_url.substring(redirect_url.indexOf('state=') + 6);

                        console.log(ACCESS_TOKEN);
                        getUserPlaylists();

                        if (state === STATE) {
                            console.log("SUCCESS")
                            user_signed_in = true;

                            setTimeout(() => {
                                ACCESS_TOKEN = '';
                                user_signed_in = false;
                            }, 3600000);

                            chrome.browserAction.setPopup({ popup: './popup-signed-in.html' }, () => {
                                sendResponse({ message: 'success' });
                            });
                        } else {
                            sendResponse({ message: 'fail' });
                        }
                    }
                }
            });
        }

        return true;
    } else if (request.message === 'logout') {
        user_signed_in = false;
        chrome.browserAction.setPopup({ popup: './popup.html' }, () => {
            sendResponse({ message: 'success' });
        });

        return true;
    }
});


function getUserPlaylists() {
    $.ajax({
        url: "https://api.spotify.com/v1/me/playlists",
        headers: {
            "Authorization": "Bearer " + ACCESS_TOKEN,
            "Content-Type": "application/json"
        },

    }).done(data => {
        console.log(data.items);
        data.items.forEach(playlist => {
            chrome.contextMenus.create({
                title: playlist.name,
                contexts: ["selection"],  // ContextType
                id: playlist.id,
                parentId: "parent",
                onclick: (text) => addSongToPlaylist(text, playlist.id)
            });
        })
    })
}

addSongToPlaylist = function (text, playlistId) {
    console.log("ADDING SONG")
    var query = (text.selectionText).replaceAll('-', "");
    $.ajax({
        url: "https://api.spotify.com/v1/search?type=track&q=" + query,
        headers: {
            "Authorization": "Bearer " + ACCESS_TOKEN,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    }).done(data => {
        console.log(data.tracks)
        if (data.tracks.items.length > 0) {
            var songId = data.tracks.items[0].id;
            var uri = encodeURIComponent("spotify:track:" + songId);
            $.ajax({
                method: "POST",
                url: "https://api.spotify.com/v1/playlists/" + playlistId + "/tracks?uris=" + uri,
                headers: {
                    "Authorization": "Bearer " + ACCESS_TOKEN,
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            }).done(_ => {
                console.log("song added");
            })
        } else {
            alert("No song found")
        }
    });
}



