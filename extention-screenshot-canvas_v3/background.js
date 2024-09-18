
// Обработка сообщений для скриншотов и аннотаций
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureScreen') {
        // Получаем текущую вкладку
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            const url = new URL(tab.url);
            
            // Преобразование URL в безопасное имя файла
            const safePathname = url.href.replace(/^https?:\/\//, '').replace(/[\/\#$%*&^><.,]/g, '_');
            const filename = `${safePathname}.png`;

            // Захватываем скриншот текущей вкладки
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, (image) => {
                // Сохраняем скриншот
                chrome.downloads.download({
                    url: image,
                    filename: filename
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Download failed: ${chrome.runtime.lastError}`);
                    } else {
                        console.log(`Download started: ${downloadId}`);
                    }
                });
            });
        });
} else if (request.action === 'annotateScreen') {
    // Захватываем скриншот для аннотации
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0]; // Текущая активная вкладка
        let activeTabURL = activeTab.url; // URL активной вкладки

        activeTabURL = activeTabURL.replace(/^https?:\/\//, '');
        const safeUrl = activeTabURL.replace(/[\/\#$%*&^><.,]/g, '_');
        
        // Проверяем, содержит ли URL подстроку 'editor/editor.html'
        if (!activeTabURL.includes('editor/editor.html')) {
            // Если пользователь не на странице редактора, продолжаем захват и открытие редактора
            chrome.tabs.captureVisibleTab(null, {}, (image) => {
                // Сохраняем скриншот в локальное хранилище
                chrome.storage.local.set({ screenshot: image }, () => {
                    // Преобразуем URL активной вкладки в параметр строки запроса без специальных символов
                    const editorUrl = chrome.runtime.getURL('./editor/editor.html') + `?sourceUrl=${safeUrl}`;
                    
                    // Открываем страницу редактирования с преобразованным URL
                    chrome.tabs.create({ url: editorUrl });
                });
            });
        } else {
            // Если уже на странице редактора, выводим сообщение
            chrome.runtime.sendMessage({ action: 'showAlert' });
        }
    });
}
});
