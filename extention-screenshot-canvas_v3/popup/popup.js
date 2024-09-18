document.getElementById('captureScreen').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'captureScreen' });
});

document.getElementById('annotateScreen').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'annotateScreen' });
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const activeTabURL = new URL(activeTab.url);
        const editorPath = 'editor/editor.html';
    
        if (activeTabURL.pathname.includes(editorPath)) {
            // document.getElementById('body').style.display = 'none'; // Скрываем элементы
            document.getElementById('captureScreen').style.backgroundColor = '#8f8f8f';
            document.getElementById('annotateScreen').style.backgroundColor = '#8f8f8f';
            document.getElementById('captureScreen').style.cursor = 'default';
            document.getElementById('annotateScreen').style.cursor = 'default';
        }
    });
});
