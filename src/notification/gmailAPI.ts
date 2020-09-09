import * as  nodemailer from "nodemailer";
import  { google } from "googleapis";
import { configuration } from '../libs/appconfig';
import { Logger } from '../libs/logger';
import { EnSeverity } from '../libs/enums';
const OAuth2 = google.auth.OAuth2;

import * as sleep from "sleep";

export class MailAPI {
    g_client_secret:string;
    g_client_id:string;
    g_refresh_token:string;
    user: string;
    oauth2Client : any;//google.auth.OAuth2;
    
    constructor()
    {
        //const OAuth2 = google.auth.OAuth2;

         this.g_client_secret=configuration.gmailSite.clientsecret;
         this.g_client_id=configuration.gmailSite.clientid;
         this.g_refresh_token =configuration.gmailSite.refreshtoken;
         this.user = configuration.gmailSite.user;
         this.oauth2Client = new OAuth2(
            this.g_client_id,
            this.g_client_secret, // Client Secret
            "https://developers.google.com/oauthplayground" // Redirect URL
          );
          
          this.oauth2Client.setCredentials({
            refresh_token: this.g_refresh_token
          });  
          
         
              

    }

    async sendEmail(to:string,from:string,subject:string, text:string){

      let log: Logger = new Logger('GMailAPI');
      const accessToken = this.oauth2Client.getAccessToken()
          
      const smtpTransport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                 type: "OAuth2",
                 user: this.user, 
                 clientId: this.g_client_id,
                 clientSecret:this.g_client_secret,
                 refreshToken:this.g_refresh_token,
                 accessToken: accessToken
            },
            tls: {
              rejectUnauthorized: false
            },
            pool: true
          });
      
        //console.log(accessToken)
        const mailOptions = {
            from:this.user,
            to: to,//"sonia.mawandia@hcl.com",cd..
            cc:"sonia.mawandia@hcl.com",
            subject: subject,// "Node.js Email with Secure OAuth",
            generateTextFromHTML: true,
            html: text//"<b>test</b>"
          };
            smtpTransport.sendMail(mailOptions, (error, response) => {
            //error ? console.log(error) : console.log("mail sent");
            error? log.logerror( error.message,error, "gmailAPI", EnSeverity.critical):{};
                
            smtpTransport.close();
            });
        }


}

