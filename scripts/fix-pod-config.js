const fs = require('fs');
const path = require('path');

const podfilePath = path.join(__dirname, '..', 'ios', 'Podfile');
if (fs.existsSync(podfilePath)) {
    let podfile = fs.readFileSync(podfilePath, 'utf8');
    podfile = podfile.replace(
        /pod 'GoogleUtilities'/,
        "pod 'GoogleUtilities', :modular_headers => true"
    );
    fs.writeFileSync(podfilePath, podfile, 'utf8');
    console.log('Podfile patched successfully');
} else {
    console.log('Podfile not found, skipping patch');
}
