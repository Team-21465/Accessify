chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    textSize: 1.0,
    contrastMode: 'auto',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    colorBlindFilter: 'off'
  });
});

