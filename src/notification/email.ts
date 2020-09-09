import * as https from "https";
import { Logger } from '../libs/logger';
import { AlertModel, User, EnrichedAlertModel, AlertInputModel } from '../models/alertmodel';
import { Options } from "request";
import { EnSeverity } from '../libs/enums';

import * as gmail from '../notification/gmailAPI';


let log: Logger = new Logger('Mail Alert');
export class MailAPI {
  constructor(){}
  
 sendEmail(name:string, email:string, subject:string, content:string)
  {
    
var opt:https.RequestOptions = {
  "method": "POST",
  "hostname": "api.pepipost.com",
  "port": undefined,
  "path": "/v5/mail/send",
  "headers": {
    "api_key": "33a7a273c16095f5567a0c40f580390f",
    "content-type": "application/json"
  }
};

var req = https.request(opt, function (res) {
  var chunks:Uint8Array[]=[]

  res.on("data", function (chunk:Uint8Array) {
    chunks.push(chunk);
  });

  res.on("end", function () {
    var body = Buffer.concat(chunks);
   //console.log("mail sent to "+name+":"+body.toString());
   log.logmsg("mail sent to "+name+":"+body.toString(),'Email Alert',EnSeverity.low);
  });
});
  
    //console.log("Before send email")
      req.write(JSON.stringify({
        from: {email: 'soniamawandia@pepisandbox.com', name: 'Alarm Delivery System'},
        subject: subject,
        content: [{type: 'html', value: content}],
        personalizations: [{to: [{email: 'sonia.mawandia@hcl.com', name: email}]}]
      })
      );
    
      req.end();
      //console.log("after send email")
  }

async prepareAndSendEmail(enricherdAlert:EnrichedAlertModel)
  {
    var alert:AlertModel=enricherdAlert.alert;
    var emailIds:string="";
    enricherdAlert.users.forEach(  user=>{
      emailIds = emailIds +";"+user.email;
    });
    
    if(emailIds != "")
    {
        var email:string=emailIds;
       var subject: string= "Alert from Society:"+alert.builderId.toString();
       var content:string="Dear User,<br>"+"There is critical alert from <br>SocietyID: "+alert.builderId+" <br>BuildingID: "+alert.buildingId+"<br>Device:"+alert.deviceId+". \
       <br>The value of "+alert.name+" is "+ alert.value+".";
        //new MailAPI().sendEmail(name,email,subject,content);
       
        await new gmail.MailAPI().sendEmail(email,"",subject,content);
    }
  
  }
}

