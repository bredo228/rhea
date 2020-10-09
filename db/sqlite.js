'use strict';

// Rhea SQLite Databasing.
// Funey, 2020

const Database = require('better-sqlite3');

module.exports = function(guildID) {
    const db = new Database('./datastore/' + guildID + '.db');

    // Initialise this guild's DataStore if it doesn't exist.
    db.exec(`CREATE TABLE IF NOT EXISTS "infractions" (
        "infractionID"	INTEGER,
        "userID"	TEXT,
        "moderatorID"	TEXT,
        "type"	TEXT,
        "reason"	TEXT,
        "timestamp"	INTEGER,
        PRIMARY KEY("infractionID")
    );`);

    db.exec(`CREATE TABLE IF NOT EXISTS "config" (
        "property"	TEXT,
        "value"	TEXT,
        PRIMARY KEY ("property")
    );`)

    // Now we're safe to let the user read/write to the database.

    this.getInfractionsByUser = function(userId) {

        return new Promise( (resolve, reject) => {
            if (userId === undefined) reject();
            try {
                let stmt = db.prepare('SELECT infractionID, userID, moderatorID, type, reason, timestamp FROM infractions WHERE userID = ?').all(userId);
                resolve(stmt);
            } catch {
                reject();
            }
        })

    }

    

    this.NPgetInfractionsByID = function(infractionID) {
        if (infractionID === undefined) return false;

        try {
            let stmt = db.prepare('SELECT infractionID, userID, moderatorID, type, reason, timestamp FROM infractions WHERE infractionID = ?').all(infractionID);
            //console.log(stmt)

            return stmt;
        } catch {
            return false;
        }
    }

    this.getInfractionsByID = function(infractionID) {

        return new Promise( (resolve, reject) => {
            if (infractionID === undefined) reject();

            try {
                let stmt = db.prepare('SELECT infractionID, userID, moderatorID, type, reason, timestamp FROM infractions WHERE infractionID = ?').all(infractionID);
                //console.log(stmt)
    
                resolve(stmt);
            } catch {
                reject();
            }
        })

    }

    this.generateInfractionID = function() {
        let bRunning = true;
        let ID = 0;

        console.log(`[DEBUG]: Generating an infraction ID.`)
        while (bRunning) {
            // Generate a random ID between 1 and 4294967295 (max uint_32 value)
            ID = Math.floor((Math.random() * 4294967295) + 1);

            if (this.NPgetInfractionsByID(ID).length == 0) {
                // We're OK to use this one, since it doesn't exist.
                console.log(`[DEBUG]: Exiting thought loop.`)
                bRunning = false;
            }
        }

        console.log(`[DEBUG]: Created a valid, unique infraction ID (${ID}).`)
        return ID;
    }

    this.addInfraction = function(userId, modId, type, reason) {
        // Do input validation

        return new Promise( (resolve, reject) => {
            console.log(`[DEBUG]: Attempting to add infraction...`)

            console.log(userId)
            console.log(modId)

            if (type === undefined || userId === undefined || modId === undefined) {
                console.log(`[DEBUG]: Missing argument - rejected.`)
                reject()
            };

            reason = reason || "No reason specified." // If no reason is specified, set the reason to say such.
    
            let infID = this.generateInfractionID();
            let stamp = Math.round((new Date()).getTime() / 1000);
    
            try {
                db.prepare(`INSERT INTO infractions (infractionID, userID, moderatorID, type, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)`).run(infID, userId, modId, type, reason, stamp);
                console.log(`[DEBUG]: Added OK, resolved.`)
                resolve(infID);
            } catch {
                console.log(`[DEBUG]: Failed for some reason - rejected.`)
                reject();
            }
        })
    }

    // Objects
    this.updateObject = function(property, value) {
        return new Promise( (resolve, reject) => {
            try {
                let val = value.toString();
                db.prepare(`
                INSERT INTO config (property, value) 
                    VALUES (?, ?)
                    ON CONFLICT (property) DO UPDATE SET
                        value = excluded.value
                    WHERE property = ?
                `).run(property, val, property)

                resolve();
            } catch {
                console.log(`[DEBUG]: Failed to update object for some reason - rejected.`)
                reject();
            }
        })

    }

    this.getObject = function(property) {
        return new Promise ( (resolve, reject) => {
            try {
                let stmt = db.prepare('SELECT value FROM config WHERE property = ?').all(property);
                //console.log(stmt)
                resolve(stmt);
            } catch (err) {
                console.log(err);
                reject();
            }
        })
    }

}