/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/log', 'N/record',
        '../const/nuage-approval-const-level',
        '../dao/nuage-approval-instance',
        '../dao/nuage-approval',
        '../dao/nuage-approval-settings',

    ],
    /**
 * @param{log} log
 * @param{record} record
 */
    (log, record, nConst, NInstance, Napproval, NSettings) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            const user = scriptContext.request.parameters.user;
            const level = scriptContext.request.parameters.level;
            const instanceId = scriptContext.request.parameters.instance_id;
            const recType = scriptContext.request.parameters.recType;
            const recId = scriptContext.request.parameters.recId;
            const action = scriptContext.request.parameters.action;
            const submission = scriptContext.request.parameters.submission;
            const current_date = new Date();

            log.debug('Starting', user + ' | ' + level+ ' | ' +instanceId+ ' | ' +action)

            /**----------------------------- Submission for Approval only then exit -----------------------------**/
            if(submission){
                var REC = record.load({
                    type: recType,
                    id: recId
                });

                REC.setValue({
                    fieldId: nConst.SUBMISSION_FLD.TRANSACTION,
                    value: true
                });
                REC.save({
                    ignoreMandatoryFields: true
                })

                scriptContext.response.sendRedirect({
                    identifier: recType,
                    type: 'RECORD',
                    id: recId
                })
                return;
            }


            /**----------------------------- Approval and evaluation for next phase -----------------------------**/
            NInstance.updateInstance({
                id: instanceId,
                status: action,
                date: current_date,
                user:user,
                email: (action == nConst.APPROVAL_STATUS.COMPLETED) ? 'T' : 'F'
            });


            log.debug('Instance '+instanceId, 'Updated')

            //Check Transition based from Approval/Rejection
            var next = NInstance.searchLevelsToNextPhase({
                instance_id: instanceId
            });

            log.debug('Check Next transitions ', next);

            //Approve
            if(action == nConst.APPROVAL_STATUS.COMPLETED){

                //Validate the whole phase/level
                var isNext = NInstance.searchRulesForPending({
                    //level: level,
                    tranId: recId
                });

                log.debug('Next Phase? ', isNext);

                //If all rules passed, transition to next phase
                if(isNext.first){

                    if(isNext.first != level) {
                        record.submitFields({
                            type: recType,
                            id: recId,
                            values: {
                                custbody_ng_approval_state: isNext.first || ''
                            }
                        });

                        if (next.next_level_approve) {
                            const setting = NSettings.getSettings({
                                type: recType
                            });
                            new Napproval
                                .ApprovalManager()
                                .notifyApprover({
                                    id: recId,
                                    level: isNext.first,
                                    template: setting[0] ? setting[0].template : null,
                                    author: setting[0] ? setting[0].author : null
                                });


                        }
                    }
                //If no next phase; Approve the record
                }else{
                    new Napproval
                        .ApprovalManager()
                        .approve({
                            recType: recType,
                            recId: recId
                        })
                }

            //Reject
            }
            else{
                if(next.levels) {
                    var rules = NInstance.searchInstances({
                        tranId: recId,
                        level: next.levels
                    });

                    for(var r in rules){
                        NInstance.updateInstance({
                            id: rules[r].id,
                            status: action,
                            user: user,
                            date: current_date,
                            email: 'F'
                        })
                    };
                }

                if(next.next_level_reject){
                    record.submitFields({
                        type: recType,
                        id: recId,
                        values: {
                            custbody_ng_approval_state: next.next_level_reject,
                            custbody_ng_approval_submit: false,
                        }
                    })
                }
            }

            scriptContext.response.sendRedirect({
                identifier: recType,
                type: 'RECORD',
                id: recId
            })
        }

        return {onRequest}

    });
