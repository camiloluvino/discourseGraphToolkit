// ============================================================================
// UTILS: Toast Notifications
// ============================================================================

DiscourseGraphToolkit.showToast = function (message, type = 'success') {
    const toastContainer = document.createElement('div');
    toastContainer.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10001; font-size: 14px; font-weight: 500; animation: slideIn 0.3s ease-out;
        `;
    toastContainer.textContent = message;
    document.body.appendChild(toastContainer);
    setTimeout(() => {
        toastContainer.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toastContainer), 300);
    }, 3000);
};
