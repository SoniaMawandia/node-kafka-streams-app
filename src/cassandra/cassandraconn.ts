/**
 * cassandra database connection
 */

import * as cassandra from 'cassandra-driver';
import { configuration } from '../libs/appconfig';
import { Logger } from '../libs/logger';
import { EnSeverity } from '../libs/enums';
import {AppError} from '../libs/apperror';



var cassandraClient =  new cassandra.Client({
    contactPoints: [ configuration.cassandraclient.host ],
    localDataCenter: configuration.cassandraclient.localdatacenter,
    keyspace:  configuration.cassandraclient.keyspace
  });

var log: Logger = new Logger('CasssandrConn');

cassandraClient.on('error', function(err){
    if (!err) {
        log.loginfo('***Cassandra database Connection established***',"cassandraClient", EnSeverity.low);
        setCassandraConn(cassandraClient);
    }else{        
        cassandraClient.shutdown();
        new AppError(err.message, err.stack, log, "cassandraClient");
    }
});

export function getCassandraConn(): cassandra.Client{
    return cassandraClient;
} 
export function setCassandraConn(dbobj: cassandra.Client): void {
    cassandraClient = dbobj;
}