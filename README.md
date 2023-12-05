A node.js script for reading ARK: Survival Evolved save files. This was originally made to debug a corrupted save file. Although untested, it may work with other Unreal Engine 4/5 data to a small extent.

# Demo
Try the demo without installing. It will prompt for an ark file and show the result in the terminal. Only works for tribe files (`*.arktribe`) and profile files (`*.arkprofile`).
```
npx github:Wupb/ark-save-reader
```

# Install
```
npm install git+ssh://github.com/Wupb/ark-save-reader
```

# Usage
```javascript
// CJS
const {readProperty, readStruct} = import("ark-save-reader");

// ESM
import {readProperty, readStruct} from "ark-save-reader";

// Reads a single UE4 property object
var {value, bytesRead} = readProperty(buffer, offset);

// Reads the content of a UE4 struct
var {value, bytesRead} = readStruct(buffer, offset);
```

* `buffer`: A node buffer object containing the data to be read
* `offset`: An integer indicating where to start reading
    * For `readProperty()`, this should be 4 bytes before a valid property string
    * For `readStruct()`, this should be 4 bytes before a struct key string
* `value`: A JSON-compatible value that closely represents the struct/property
* `bytesRead`: An integer equaling to the number of bytes read from the buffer to get the value

# Examples
```javascript
import {readStruct} from "ark-save-reader";

var buffer = Buffer.from('\x0A\x00\x00\x00TribeData\x00\x0F\x00\x00\x00StructProperty\x00\xE4\x02\x00\x00\x00\x00\x00\x00\x0A\x00\x00\x00TribeData\x00\x0A\x00\x00\x00TribeName\x00\x0C\x00\x00\x00StrProperty\x00\x13\x00\x00\x00\x00\x00\x00\x00\x0F\x00\x00\x00Tribe of Human\x00\x12\x00\x00\x00OwnerPlayerDataID\x00\x0F\x00\x00\x00UInt32Property\x00\x04\x00\x00\x00\x00\x00\x00\x00\xB1h\xDE:\x08\x00\x00\x00TribeId\x00\x0C\x00\x00\x00IntProperty\x00\x04\x00\x00\x00\x00\x00\x00\x00\xD2\x02\x96I\x12\x00\x00\x00MembersPlayerName\x00\x0E\x00\x00\x00ArrayProperty\x00\x0E\x00\x00\x00\x00\x00\x00\x00\x0C\x00\x00\x00StrProperty\x00\x01\x00\x00\x00\x06\x00\x00\x00Human\x00\x14\x00\x00\x00MembersPlayerDataID\x00\x0E\x00\x00\x00ArrayProperty\x00\x08\x00\x00\x00\x00\x00\x00\x00\x0F\x00\x00\x00UInt32Property\x00\x01\x00\x00\x00\xB1h\xDE:\x0F\x00\x00\x00bSetGovernment\x00\x0D\x00\x00\x00BoolProperty\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01\x10\x00\x00\x00TribeGovernment\x00\x0F\x00\x00\x00StructProperty\x00\x82\x00\x00\x00\x00\x00\x00\x00\x10\x00\x00\x00TribeGovernment\x00\x1A\x00\x00\x00TribeGovern_DinoOwnership\x00\x0C\x00\x00\x00IntProperty\x00\x04\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x1F\x00\x00\x00TribeGovern_StructureOwnership\x00\x0C\x00\x00\x00IntProperty\x00\x04\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x05\x00\x00\x00None\x00\x09\x00\x00\x00TribeLog\x00\x0E\x00\x00\x00ArrayProperty\x00X\x00\x00\x00\x00\x00\x00\x00\x0C\x00\x00\x00StrProperty\x00\x01\x00\x00\x00P\x00\x00\x00Day 1, 12:00:00: <RichColor Color="0, 1, 1, 1">Human was added to the Tribe!</>\x00\x09\x00\x00\x00LogIndex\x00\x0C\x00\x00\x00IntProperty\x00\x04\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x05\x00\x00\x00None\x00\x05\x00\x00\x00None\x00', 'ascii')

console.log(readStruct(buffer, 0).value);
// {
//   TribeData: {
//     _structType: 'TribeData',
//     TribeName: 'Tribe of Human',
//     OwnerPlayerDataID: 987654321,
//     TribeId: 1234567890,
//     MembersPlayerName: [ 'Human' ],
//     MembersPlayerDataID: [ 987654321 ],
//     bSetGovernment: true,
//     TribeGovernment: {
//       _structType: 'TribeGovernment',
//       TribeGovern_DinoOwnership: 1,
//       TribeGovern_StructureOwnership: 1
//     },
//     TribeLog: [
//       'Day 1, 12:00:00: <RichColor Color="0, 1, 1, 1">Human was added to the Tribe!</>'
//     ],
//     LogIndex: 1
//   }
// }
```


