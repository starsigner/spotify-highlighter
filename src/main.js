searchUrbanDict = function(word){
    var query = (word.selectionText).replaceAll('-', "");
    chrome.tabs.create({url: 'https://open.spotify.com/search/' + query});
 };

chrome.contextMenus.create({
 title: "Add Song to Spotify Playlist",
 contexts:["selection"],  // ContextType
 id: "parent"
});


