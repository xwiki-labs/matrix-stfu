const Matrix = require("matrix-js-sdk");
const nThen = require('nthen');

const Config = require('./config.js');

const main = () => {
    const args = process.argv.slice(2);
    
    if (args.length !== 2) {
        console.log('Usage: node ./stfu.js <room name> <user name>');
        console.log('Mass-redact everything that was said by a given user in a given room');
        return;
    }

    const roomName = args[0];
    const userName = args[1];

    console.log("Removing all messages in [" + roomName + '] written by [' + userName + ']');

    let client;
    let room;
    let events;
    nThen((waitFor) => {
        client = Matrix.createClient({
            baseUrl: 'https://' + Config.userName.split(':')[1],
            accessToken: Config.accessToken,
            userId: Config.userName
        });

        const done = waitFor();
        client.on('sync', function (state, prevState, data) {
            if (state === 'ERROR') { console.log(data); }
            if (state === 'PREPARED') { done(); }
        });
        client.startClient();
    }).nThen((waitFor) => {
        client.getRoomIdForAlias(roomName, waitFor((err, id) => {
            if (err) { throw err; }
            console.log('Got room internal id>', id.room_id);
            room = client.getRoom(id.room_id);
        }));
    }).nThen((waitFor) => {
        console.log('Getting history');
        client.scrollback(room, Config.historyLimit, (err, evts) => {
            if (err) { throw err; }
            if (evts.chunk) {
                if (events) { throw new Error("Events is already defined"); }
                events = evts;
            }
        }).then(waitFor());
    }).nThen((waitFor) => {
        console.log('Got history');
        // I have no clue why we need both the events query and the LiveTimeline but without
        // them both, the list is incomplete.
        const allEvents = [];
        Array.prototype.push.apply(allEvents, events.chunk);
        Array.prototype.push.apply(allEvents,
                room.getLiveTimeline().getEvents().map((e)=>(e.event)));

        let nt = nThen;
        allEvents.forEach((x) => {
            if (x.type !== 'm.room.message') { return; }
            if (x.sender !== userName) { return; }
            if (JSON.stringify(x.content) === '{}') { return; }

            nt = nt((waitFor) => {
                const doit = () => {
                    //console.log('going to nuke', x.event_id, JSON.stringify(x.content));
                    client.redactEvent(room.roomId, x.event_id, waitFor((err, ret) => {
                        if (err && err.errcode === 'M_LIMIT_EXCEEDED') {
                            console.log("M_LIMIT_EXCEEDED");
                            setTimeout(waitFor(doit), err.data.retry_after_ms);
                            return;
                        }
                        console.log('Deleting>', x.event_id, JSON.stringify(x.content));
                        if (err) { console.log("ERROR:"); console.log(err); console.log(r); }
                    }));
                };
                doit();
            }).nThen;
        });
        nt(waitFor());

    }).nThen((waitFor) => {
        console.log("\nDone");
        client.stopClient();
    });
};
main();