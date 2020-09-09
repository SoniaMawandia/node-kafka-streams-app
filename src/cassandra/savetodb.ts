 import * as cassandra from 'cassandra-driver';
 import { getCassandraConn } from './cassandraconn';
//import { Constant } from '../libs/constants';
import { Logger } from '../libs/logger';
import { EnSeverity } from '../libs/enums';
import { AlertModel,EnrichedAlertModel,AlertInputModel } from '../models/alertmodel';
//import { AlertModel, User, DeviceUser, EnrichedAlertModel } from '../models/alertmodel';
import {BadAlertModel, InvalidAlertModel} from '../models/badalertmodel'
import { Guid } from 'guid-typescript'; 


let client:  cassandra.Client = getCassandraConn();

export class savetodb {

    private log: Logger = new Logger('Alert');
    constructor() { 

    }

    // static createParams(model:AlertModel, paramList: string[])
    // {
    //     const returnval:string[]=[];
    //     paramList.forEach(colname => {
    //         var value = model[colname]
    //         returnval.push(value);
    //     })
    //     return returnval;
    // }

    async saveAlerts(alert:AlertInputModel)
    {

        let date: Date = new Date(); 
        const insertQuery = `INSERT INTO alerts (alertId,builderId , buildingId, deviceId , eventTimestamp , name , value,receivedTimestamp,severity  ) 
        VALUES (?,?, ?,?,?,?,?,?,?)`;
        const  insertParams = [alert.alertId.toString(),alert.builderId.toString(),alert.path.buildingId.toString(),alert.path.deviceId.toString(),
            alert.eventTimestamp,alert.name,alert.value,date.toString(),alert.severity ]
        this.executeQuery(insertQuery, insertParams);
        
    }

    async saveEnrichedAlerts(enrichedAlert: EnrichedAlertModel)
    {
       
        let date: Date = new Date(); 
        const insertQuery = `INSERT INTO enrichedalerts (alertId, builderId , buildingId, deviceId ,
             eventTimestamp , name , value, username , email , phonenumber  , receivedTimestamp  ) 
        VALUES (?,?, ?,?,?,?,?,?,?,?,?)`;
        var insertParams:string[]=[];
        var alert:AlertModel=enrichedAlert.alert;
        
        enrichedAlert.users.forEach(user=>{
           
            var alertId: Guid=JSON.parse(JSON.stringify( enrichedAlert.alert.alertId)).value
            insertParams = [alertId.toString(),alert.builderId.toString(),alert.buildingId.toString(),
                alert.deviceId.toString(),
                alert.eventTimestamp,alert.name,alert.value, user.userId,user.email,user.phone,date.toString()];
            this.executeQuery(insertQuery, insertParams);
            
        }

        );
        //const  insertParams = [alert.builderId.toString(),alert.buildingId.toString(),alert.deviceId.toString(),alert.eventTimestamp,alert.name,alert.value]
     }

    async saveBadAlerts(badalert: AlertModel,reason: string)
    {
        
        let date: Date = new Date();
        let alertId: Guid= JSON.parse(JSON.stringify( badalert.alertId)).value
        
        const badalerts = `INSERT INTO badalerts (alertId, builderId , buildingId, deviceId , eventTimestamp , name , value,reason,receivedTimestamp  ) 
        VALUES (?,?, ?,?,?,?,?,?,?)`; 
        const  insertParams = [alertId.toString(), badalert.builderId.toString(),badalert.buildingId.toString(),
            badalert.deviceId.toString(),badalert.eventTimestamp,badalert.name,badalert.value,reason,date.toString()]
        this.executeQuery(badalerts, insertParams);
    }

    async saveInvalidAlerts(invalidalerts: InvalidAlertModel[])
    {
        for (var i = 0; i < invalidalerts.length; i++) {

        let  badalert:InvalidAlertModel = invalidalerts[i];
        //console.log("saveInvalidAlerts:"+badalert.alert.alertId.toString())
        //console.log(badalert);
        let date: Date = new Date();
        let alertId: Guid=Guid.create();
        const invalidalert = `INSERT INTO invalidalerts (alertId, builderId , buildingId, deviceId , eventTimestamp , name , value,reason,receivedTimestamp  ) 
        VALUES (?,?, ?,?,?,?,?,?,?)`; 
        const  insertParams = [badalert.alert.alertId.toString(), badalert.alert.builderId.toString(),badalert.alert.path.buildingId.toString(),
            badalert.alert.path.deviceId.toString(),badalert.alert.eventTimestamp,badalert.alert.name,badalert.alert.value
            ,badalert.reason,date.toString()]
        this.executeQuery(invalidalert, insertParams);
        }
    }

    async executeQuery(query:string, params:string[])
    {
        client.execute(query, params, { prepare: true }, (error, resultset) => {
            if (error)
            {
                this.log.logerror('Error occurred while saving data', error.message, "savetodb", EnSeverity.critical);
                this.log.logerror('Query : ', query, "savetodb", EnSeverity.critical);
                this.log.logerror('Params : ', params, "savetodb", EnSeverity.critical);
                console.log(query);
                console.log(params)
                return console.log(error.message);
            }
            
        });
        //console.log('Row updated on the cluster');
    }
}