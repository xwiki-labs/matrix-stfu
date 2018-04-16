# Matrix STFU

Spam / Trolling Filtration Utility

![the title says it all](https://raw.github.com/xwiki-labs/matrix-stfu/master/stfu.jpg)

Mass remove everything which was said by a particular user in a particular room.

## How to use

1. `cp ./config.example.js ./config.js`
2. Edit config.js to make it use your username and access token, you can also change how far into history STFU will search (number of events).
3. `node ./stfu.js <matrix_room_name> <matrix_handle>`

For example, in case cjd is saying silly stuff in the Matrix HQ room, and you're an admin there, you can delete all of it.

    node ./stfu.js '#matrix:matrix.org' '@cjd:matrix.org'