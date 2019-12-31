//
// Copyright (c) 2020 Cisco Systems
// Licensed under the MIT License
//

// CE maximum volume for Ultrasound 
// note: Since CE 9.9, max is 70 across all devices
//const MAX = 90 // for a DX80
//const MAX = 70 // for a RoomKit
const MAX = 70 

//
// Connect to the device
//

const jsxapi = require('jsxapi');

// Check args
if (!process.env.JSXAPI_DEVICE_URL || !process.env.JSXAPI_USERNAME) {
    console.error("Please specify info to connect to your device as JSXAPI_DEVICE_URL, JSXAPI_USERNAME, JSXAPI_PASSWORD env variables");
    console.error("Bash example: JSXAPI_DEVICE_URL='ssh://192.168.1.34' JSXAPI_USERNAME='integrator' JSXAPI_PASSWORD='integrator' node ultrasound-jsxapi.js");
    process.exit(1);
}

// Empty passwords are supported
const password = process.env.JSXAPI_PASSWORD ? process.env.JSXAPI_PASSWORD : "";

// Connect to the device
console.log("connecting to your device...");
const xapi = jsxapi.connect(process.env.JSXAPI_DEVICE_URL, {
    username: process.env.JSXAPI_USERNAME,
    password: password
});
xapi.on('error', (err) => {
    switch (err) {
        case "client-socket":
            console.error("could not connect: invalid URL.");
            break;

        case "client-authentication":
            console.error("could not connect: invalid credentials.");
            break;

        case "client-timeout":
            console.error("could not connect: timeout.");
            break;

        default:
            console.error(`encountered error: ${err}.`);
            break;
    }

    console.log("exiting...");
    process.exit(1);
});


//
// Code logic
//

xapi.on('ready', () => {
    console.log("connexion successful");

    // Initialize the widgets
    xapi.config.get('Audio Ultrasound MaxVolume')
        .then(updateUI)

    // Update configuration from UI actions
    xapi.event.on('UserInterface Extensions Widget Action', (event) => {
        if (event.WidgetId !== 'volume_slider') return
        if (event.Type !== 'released') return

        // Update Ultrasound configuration
        const volume = Math.round(parseInt(event.Value) * MAX / 255);
        console.log(`updating Ultrasound configuration to: ${volume}`)
        xapi.config.set('Audio Ultrasound MaxVolume', volume)
    })

    // Update UI from configuration changes
    xapi.config.on('Audio Ultrasound MaxVolume', updateUI)

    // Update if the controls is (re-)deployed
    xapi.event.on('UserInterface Extensions Widget LayoutUpdated', (event) => {
        console.log(`layout updated, let's refresh the widgets`)
        xapi.config.get('Audio Ultrasound MaxVolume')
            .then(updateUI)
    });
})


function updateUI(volume) {
    console.log(`updating UI to new Ultrasound configuration: ${volume}`)

    // Update text
    xapi.command('UserInterface Extensions Widget SetValue', {
        WidgetId: 'volume_text',
        Value: volume
    })
        .then(() => {
            // Update custom message
            let newVolume = parseInt(volume)
            if (newVolume <= 5) {
                xapi.config.set('UserInterface CustomMessage', "/!\\ Pairing is disabled")
                return
            }

            // Pick the message that suits your device's registration mode
            // If cloud-registered
            xapi.config.set('UserInterface CustomMessage', "Tip: Launch Webex Teams to pair")
            // If registered on-premises (VCS or CUCM )
            //xapi.config.set('UserInterface CustomMessage', "Tip: Pair from a Proximity client")
        })

    // Update slider 
    const level = Math.round(parseInt(volume) * 255 / MAX)
    xapi.command('UserInterface Extensions Widget SetValue', {
        WidgetId: 'volume_slider',
        Value: level
    })
}
