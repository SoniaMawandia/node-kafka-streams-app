import * as express from 'express';
import * as moment from 'moment';
import { EntityValidation } from '../validations/entityValidation';
import { Alerts } from '../produce/alertProducer';
import { AlertModel, AlertInputModel, AlertResponseModel } from '../models/alertmodel';
import { BadAlertModel,InvalidAlertModel } from '../models/badalertmodel';
import { AppError } from '../libs/apperror';
import { Logger } from '../libs/logger';
import { EnSeverity } from '../libs/enums';
import {savetodb} from '../cassandra/savetodb';
import { Guid } from 'guid-typescript';

export class AlertsAPI {

    private alert: Alerts = new Alerts();
    private log: Logger = new Logger('AlertsAPI');
    private validator: EntityValidation = new EntityValidation();

    constructor() { }

    /**
    * @api {post} 
    * @apiName produceAlert - produce an alert or event to a kafka topic 
    *
    * @apiParam  {Object} [Alert] object
    * 
    * @apiSuccess (200) {string} `succeed` string
    */
    async produceAlert(req: express.Request, res: express.Response) {

        const _that = this;

        let alertEntityArray: AlertModel[] = [];
        let badAlertEntityArray: BadAlertModel[] = [];
        let badAlertReason: InvalidAlertModel[] = [];
        let errorArray: Error[] = [];
        let alertResponseModel: AlertResponseModel = new AlertResponseModel();

        try {
            for (var i = 0; i < req.body.length; i++) {
                let data = req.body[i];

                let entity = new AlertModel();
                entity.alertId=Guid.create();
                
                let requestEntity = new AlertInputModel();
                
                //debugger;
                let badAlertEntity = new BadAlertModel();
                let error = new Error();
                let isValidAlert: boolean = true;
                let errorMessage: string = 'Error(s) occurred: ';
                let curTimestamp:string = moment.utc().toISOString();

                try {
                    requestEntity = req.body[i];
                    requestEntity.alertId=entity.alertId;

                    let validationSummary = await this.validator.ProduceAlertValidation(requestEntity);
                    //save to database
                    await new savetodb().saveAlerts(requestEntity);
                    if (validationSummary.length > 0) {
                        error.name = errorMessage = JSON.stringify(validationSummary);//validationSummary.join('. ');
                        isValidAlert = false;
                    }
                    else {
                        entity.builderId = data.builderId;
                        entity.buildingId = data.path.buildingId;
                        entity.deviceId = data.path.deviceId;
                        entity.severity = data.severity;
                        entity.value = data.value;
                        entity.name = data.name;
                        entity.producerTimestamp = curTimestamp;
                        
                        try {
                            if (moment(data.eventTimestamp.toString()).isValid() && this.ValidateTime(data.eventTimestamp))
                            {
                                entity.eventTimestamp = data.eventTimestamp;
                                 
                                console.log(moment.utc(moment(data.eventTimestamp)).format())//moment(data.eventTimestampts).utc());
                            }
                            else {
                                errorMessage = errorMessage + 'EventTimestamp is invalid or older than 24 hours ';
                                
                                isValidAlert = false;
                            }
                        }
                        catch {
                            errorMessage = errorMessage + 'EventTimestamp is invalid. ';
                            isValidAlert = false;
                        }

                        error.name = errorMessage;
                    }

                    // Producer entities:
                    if (!isValidAlert) {
                        badAlertEntity.alertJson = requestEntity;
                        badAlertEntity.reason = error.name;
                        badAlertEntity.producerTimestamp = curTimestamp;
                        badAlertEntityArray.push(badAlertEntity);
                        badAlertReason.push({ alert: requestEntity, reason: error.name });
                    }
                    else {
                        
                        alertEntityArray.push(entity);
                    }
                } catch (e) {
                    // BadAlert Producer
                    badAlertEntity.alertJson = requestEntity;
                    badAlertEntity.reason = e.message;
                    badAlertEntity.producerTimestamp = curTimestamp;
                    badAlertEntityArray.push(badAlertEntity);
                    badAlertReason.push({ alert: requestEntity, reason: e.message });

                    //throw error
                    let error = new AppError(`Getting exception while digesting event - ${e.message}`,
                        e.stack, _that.log, "produceAlert");
                    errorArray.push(error);
                }
            }

            if (badAlertEntityArray.length > 0) {
                this.alert.produceBadAlert(badAlertEntityArray, (done: any) => {
                    //(JSON.stringify({ request: badAlertEntityArray, response: done }));
                    _that.log.loginfo(JSON.stringify({ request: badAlertEntityArray, response: done }), "Produced Bad Events", EnSeverity.high);
                });
            }
            if (alertEntityArray.length > 0) {
                this.alert.produceAlert(alertEntityArray, (done: any) => {
                    //console.log(JSON.stringify({ request: alertEntityArray, response: done }));
                    _that.log.loginfo(JSON.stringify({ request: alertEntityArray, response: done }), "Produce Events", EnSeverity.high);
                });
            }

            let outMsg = {
                "Total Alert Count": req.body.length,
                "Valid Alert Count": alertEntityArray.length,
                "Bad Alert Count": badAlertEntityArray.length
                //,
                //"Bad Alerts": badAlertReason
            }
            alertResponseModel.status = 200;
            alertResponseModel.data = outMsg;
            res.status(200).send({ alertResponseModel });
            if(badAlertReason.length>0)
            {
                 await new savetodb().saveInvalidAlerts(badAlertReason);
                _that.log.logmsg(" Bad Alert Reason: "+JSON.stringify(badAlertReason).replace('\\',''),'Bad Alert',EnSeverity.low);
            }
        } catch (e) {
            //throw error
            let error = new AppError(`Getting exception while digesting events - ${e.message}`,
                e.stack, _that.log, "produceAlert");
            alertResponseModel.status = 500;
            alertResponseModel.error = error;
            alertResponseModel.name = e.message
            res.status(500).send({ alertResponseModel });
        }
    }

    ValidateTime(eventTimestr:string)
    {
        //return true;
        var evntTime:moment.Moment= moment(moment.utc(moment(eventTimestr)))
        
        var currentTime:moment.Moment=moment(moment.utc())
        var diff: number = currentTime.diff(evntTime,'h')
        //any event which is older than 24 hours or future events should be rejected.
        if(diff >=24 || diff < 0)
        {
            return false;
        }
        {
            return true;
        }
    }
}