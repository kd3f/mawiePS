document.addEventListener('DOMContentLoaded', function() { // document ready 

    const particleSystemManager = new ParticleSystemManager();

    const settingsUI = new SettingsUI(particleSystemManager);

    particleSystemManager.setSettingsUI(settingsUI);
    

// end of document ready    
});