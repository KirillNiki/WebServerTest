
let deferredPrompt;
let buttonInstall = document.getElementById('buttonInstall');


window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;

    console.log(`'beforeinstallprompt' event was fired.`);
    buttonInstall.style.visibility = `visible`;
});


buttonInstall.addEventListener('click', async () => {
    deferredPrompt.prompt();
    const outcome = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    deferredPrompt = null;
    buttonInstall.style.visibility = `hidden`;
});

