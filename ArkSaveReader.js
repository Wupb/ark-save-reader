const propertyParsers = {
    BoolProperty:   readBool,
    ByteProperty:   readInt8,
    Int8Property:   readInt8,
    UInt8Property:  readUInt8,
    Int16Property:  readInt16,
    UInt16Property: readUInt16,
    IntProperty:    readInt32,
    Int32Property:  readInt32,
    UInt32Property: readUInt32,
    Int64Property:  readInt64,
    UInt64Property: readUInt64,
    FloatProperty:  readFloat,
    DoubleProperty: readDouble,
    ObjectProperty: readObject,
    StructProperty: readStruct,
    ArrayProperty:  readArray,
    StrProperty:    readStr,
    NameProperty:   readStr,
}

export function readProperty(buffer, offset) {
    let propertyString = readStr(buffer, offset);
    let bytesRead = propertyString.bytesRead;

    if (!propertyParsers.hasOwnProperty(propertyString.value)) {
        throw `"${propertyString.value}" is not a valid property or is not implemented`;
    }

    // All properties have at least 8 bytes of header
    // First 4 bytes is the size of the 'payload', and the next 4 bytes is the 'index' (of struct keys as they may share the same name).
    var payloadSize = buffer.readUInt32LE(offset + bytesRead);
    bytesRead += 8;

    // Some properties have additional data in the header when not in array of its type
    let content;
    switch(propertyString.value) {
        case "ArrayProperty":
        case "StructProperty":
            // Array and struct headers include a string (presumablely its type)
            let type = readStr(buffer, offset + bytesRead);
            bytesRead += type.bytesRead;

            content = propertyParsers[propertyString.value](buffer, offset + bytesRead, payloadSize, type.value);
            break;
        case "ByteProperty":
            // Byte headers may include a string ("None")
            // Not sure if this applies to Int8Property and UInt8Property as well
            bytesRead += readStr(buffer, offset + bytesRead).bytesRead;
            content = readInt8(buffer, offset + bytesRead);
            break;
        default:
            content = propertyParsers[propertyString.value](buffer, offset + bytesRead, payloadSize);
            break;
    }

    content.bytesRead += bytesRead;
    return content;
}

export function readStruct(buffer, offset, payloadSize, structType) {
    // Do not try to read raw data
    // Certain struct types can *probably* be further traversed
    if (
        structType !== undefined &&
        !structType.endsWith("Struct") &&
        !structType.endsWith("Data") &&
        structType !== "ItemNetInfo" &&
        structType !== "LeaderboardRow" &&
        structType !== "TribeGovernment"
    ) {
        return {value: `<${structType}>${buffer.toString(undefined, offset, offset + payloadSize)}`, bytesRead: payloadSize};
    }

    // The number of items in a struct is unknown, instead, it ends when it reaches a "None" string
    let struct = structType ? {_structType: structType} : {};
    let bytesRead = 0;
    while (true) {
        // Get the key
        let key = readStr(buffer, offset + bytesRead);
        bytesRead += key.bytesRead;

        // Check if it is the last item
        if (key.value === "None") {
            // Check that the struct size is valid
            if (Number.isInteger(payloadSize) && payloadSize !== bytesRead) {
                console.warn(`Struct at ${offset} should end at ${offset + payloadSize}, but ends instead at ${offset + bytesRead}`);
            }

            return {value: struct, bytesRead};
        }

        // Get the index, which may be required disambiguate keys sharing the same name
        let propertyStringLength = readStr(buffer, offset + bytesRead).bytesRead;
        let index = buffer.readUInt32LE(offset + bytesRead + propertyStringLength + 4);

        // Get the value
        let value = readProperty(buffer, offset + bytesRead);
        bytesRead += value.bytesRead;

        // Save the current item
        struct[index ? `${key.value}[${index}]` : key.value] = value.value;
    }
}

function readArray(buffer, offset, payloadSize, arrayType) {
    // Array payload starts with 4 bytes corresponding to the number of items in the array
    let arrayLength = buffer.readUInt32LE(offset);
    let bytesRead = 4;

    let array = [];
    for (let item, i = 0; i < arrayLength; i++) {
        item = propertyParsers[arrayType](buffer, offset + bytesRead);
        array.push(item.value);
        bytesRead += item.bytesRead;
    }

    if (Number.isInteger(payloadSize) && payloadSize !== bytesRead) {
        console.warn(`Array at ${offset} should end at ${offset + payloadSize}, but ends instead at ${offset + bytesRead}`);
    }

    return {value: array, bytesRead};
}

function readObject(buffer, offset, payloadSize) {
    // The first 4 bytes determine whether the rest of the object is a string, 1 byte, or 0 byte.
    let int = buffer.readUInt32LE(offset);
    if (int === 1) {
        let string = readStr(buffer, offset + 4, payloadSize - 4);
        string.bytesRead += 4;
        return string;
    } else if (int === 0) {
        if (Number.isInteger(payloadSize) && payloadSize !== 8) {
            console.warn(`Payload size for ObjectProperty at ${offset} is not 8 (${payloadSize})`);
        }
        return {value: "0x" + buffer.readInt32LE(offset + 4).toString(16), bytesRead: 8};
    } else if (int === 0xFFFFFFFF) {
        if (Number.isInteger(payloadSize) && payloadSize !== 4) {
            console.warn(`Payload size for ObjectProperty at ${offset} is not 4 (${payloadSize})`);
        }
        return {value: null, bytesRead: 4};
    } else {
        throw `Unexpected header for ObjectProperty at ${offset}`;
    }
}

function readStr(buffer, offset, payloadSize) {
    // All strings are headed by 4 bytes corresponding to their length followed by the string itself
    let stringLength = buffer.readUInt32LE(offset);
    let string = buffer.toString(undefined, offset + 4, offset + 4 + stringLength - 1); // Omit the null terminator

    if (Number.isInteger(payloadSize) && payloadSize !== stringLength + 4) {
        console.warn(`String at ${offset} should end at ${offset + payloadSize}, but ends instead at ${offset + stringLength + 4}`)
    }

    return {value: string, bytesRead: stringLength + 4};
}

function readFloat(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 4) {
        console.warn(`Payload size for FloatProperty is not 4 (${payloadSize})`);
    }
    return {value: buffer.readFloatLE(offset), bytesRead: 4};
}

function readDouble(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 8) {
        console.warn(`Payload size for DoubleProperty is not 8 (${payloadSize})`);
    }
    return {value: buffer.readDoubleLE(offset), bytesRead: 8};
}

function readBool(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 0) {
        console.warn(`Payload size for BoolProperty is not 0 (${payloadSize})`);
    }

    let result = readUInt8(buffer, offset);
    result.value = Boolean(result.value);
    return result;
}

function readInt8(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 1) {
        console.warn(`Payload size for Int8Property is not 1 (${payloadSize})`);
    }
    return {value: buffer.readInt8(offset), bytesRead: 1};
}

function readUInt8(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 1) {
        console.warn(`Payload size for UInt8Property is not 1 (${payloadSize})`);
    }
    return {value: buffer.readUInt8(offset), bytesRead: 1};
}

function readInt16(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 2) {
        console.warn(`Payload size for Int16Property is not 2 (${payloadSize})`);
    }
    return {value: buffer.readInt16LE(offset), bytesRead: 2};
}

function readUInt16(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 2) {
        console.warn(`Payload size for UInt16Property is not 2 (${payloadSize})`);
    }
    return {value: buffer.readUInt16LE(offset), bytesRead: 2};
}

function readInt32(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 4) {
        console.warn(`Payload size for Int32Property is not 4 (${payloadSize})`);
    }
    return {value: buffer.readInt32LE(offset), bytesRead: 4};
}

function readUInt32(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 4) {
        console.warn(`Payload size for UInt32Property is not 4 (${payloadSize})`);
    }
    return {value: buffer.readUInt32LE(offset), bytesRead: 4};
}

function readInt64(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 8) {
        console.warn(`Payload size for Int64Property is not 8 (${payloadSize})`);
    }
    return {value: buffer.readBigInt64LE(offset), bytesRead: 8};
}

function readUInt64(buffer, offset, payloadSize) {
    if (Number.isInteger(payloadSize) && payloadSize !== 8) {
        console.warn(`Payload size for UInt64Property is not 8 (${payloadSize})`);
    }
    return {value: buffer.readBigUInt64LE(offset), bytesRead: 8};
}