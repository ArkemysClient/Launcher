function replaceText(selector, text) {
    const element = document.getElementById(selector)
    if (element)
      element.innerText = text;
}

window.addEventListener('DOMContentLoaded', () => {
    for (const type of ['chrome', 'node', 'electron'])
        replaceText(`${type}-version`, process.versions[type]);
});