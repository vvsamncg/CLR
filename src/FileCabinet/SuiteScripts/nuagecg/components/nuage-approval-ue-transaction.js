/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/runtime', 'N/url',
        '../dao/nuage-approval',
        '../dao/nuage-approval-instance',
        '../dao/nuage-approval-settings',

        '../const/nuage-approval-const-level'
    ],
    /**
 * @param{log} log
 * @param{record} record
 */
    (log, record, runtime, url,
     approval, instance, settings, aConst) => {

        const FIELDS = {
            APPROVAL_STATE: 'custbody_ng_approval_state',
            SUBMITTED: 'custbody_ng_approval_submit',
            SUBMIT: 'custbody_ng_approval_submit',
            BYPASS: 'custbody_ng_approval_bypass',
            STATUS: 'status'
        }

        const APPROVAL_SUITELET = 'customscript_ng_approval_process';
        const APPROVAL_SUITELET_DEP = 'customdeploy_ng_approval_process';
        const APPROVAL_BTN_PF = 'custpage_nuage_approve_';
        const UPDATES = ['create','copy','edit'];

        const beforeLoad = (scriptContext) => {

            const REC = scriptContext.newRecord;
            const SUBMIT = REC.getValue({
                fieldId: FIELDS.SUBMIT
            });

            if(scriptContext.type == 'copy'){
               REC.setValue({
                   fieldId: FIELDS.SUBMIT,
                   value: false
               });
                REC.setValue({
                    fieldId: FIELDS.APPROVAL_STATE,
                    value: ''
                });
            }

            if(scriptContext.type == 'edit'){
                if (SUBMIT) {
                    //throw 'You cannot edit a transaction that is under approval process.'
                }
            }

            if(scriptContext.type != 'view') return;

            try {
                const STATUS =  REC.getValue({
                    fieldId: FIELDS.STATUS
                });

                if(STATUS == aConst.TRANSACTION_STATUS.CANCELLED ||
                    STATUS == aConst.TRANSACTION_STATUS.CLOSED ||
                        STATUS == aConst.TRANSACTION_STATUS.OPEN){
                    scriptContext.form.removeButton({
                        id: 'edit'
                    });
                    return;
                }

                const USER = String(runtime.getCurrentUser().id);
                const bypass = scriptContext.newRecord.getValue({
                    fieldId: FIELDS.BYPASS
                });

                if(bypass){
                    return;
                }

                const ACTIVE = settings.getSettings({
                    type: REC.type
                });

                if(!ACTIVE)
                    return;

                const rules = instance.searchInstances({
                    tranId: REC.id,
                    level: REC.getValue({fieldId: FIELDS.APPROVAL_STATE}),
                    status: [aConst.APPROVAL_STATUS.PENDING]
                });

                log.debug('User', USER);

                log.debug('Current State Rules', rules);

                for (var r in rules) {

                    //Do not show buttons if the user is not one of the approvers.
                    if (rules[r].user_approver.indexOf(USER) == -1) {
                        log.debug('Not approver', 'Skipping');
                        continue;
                    }

                    var params = {
                        user: USER,
                        level: rules[r].level,
                        instance_id: rules[r].id,
                        recType: REC.type,
                        recId: REC.id,
                        action: aConst.APPROVAL_STATUS.COMPLETED
                    }

                    //Approve Button
                    var approve_url = url.resolveScript({
                        'scriptId': APPROVAL_SUITELET,
                        'deploymentId': APPROVAL_SUITELET_DEP,
                        'params': params
                    });

                    scriptContext.form.addButton({
                        id: APPROVAL_BTN_PF + rules[r].id,
                        label: rules[r].button_label,
                        functionName: "eval(window.location='" + approve_url + "')"
                    });

                    //Reject/Void Button
                    params.action = aConst.APPROVAL_STATUS.FAILED
                    var reject_url = url.resolveScript({
                        'scriptId': APPROVAL_SUITELET,
                        'deploymentId': APPROVAL_SUITELET_DEP,
                        'params': params
                    });

                    scriptContext.form.addButton({
                        id: APPROVAL_BTN_PF + ',_r_' + rules[r].id,
                        label: 'Reject',
                        functionName: "eval(window.location='" + reject_url + "')"
                    })

                }

                if (!SUBMIT) {
                    var urlLoc = url.resolveScript({
                        'scriptId': APPROVAL_SUITELET,
                        'deploymentId': APPROVAL_SUITELET_DEP,
                        'params': {
                            recType: REC.type,
                            recId: REC.id,
                            submission: true
                        }
                    });

                    scriptContext.form.addButton({
                        id: 'custpage_ng_submit',
                        label: 'Submit for Approval',
                        functionName: "eval(window.location='" + urlLoc + "')"
                    })
                } else {
                    scriptContext.form.removeButton({
                        id: 'edit'
                    });
                }

            }catch(e){
                log.debug('beforeLoad', e);
            }
        }


        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

            if(UPDATES.indexOf(scriptContext.type) == -1) return;

            const recordType = scriptContext.newRecord.type;
            const recordId = scriptContext.newRecord.id;
            const submitted = scriptContext.newRecord.getValue({
                fieldId: FIELDS.SUBMITTED
            });
            const bypass = scriptContext.newRecord.getValue({
                fieldId: FIELDS.BYPASS
            });

            const STATUS =  scriptContext.newRecord.getValue({
                fieldId: FIELDS.STATUS
            });

            if(STATUS == aConst.TRANSACTION_STATUS.CANCELLED ||
                STATUS == aConst.TRANSACTION_STATUS.CLOSED){
                scriptContext.form.removeButton({
                    id: 'edit'
                });
                return;
            }

            var manager = new approval.ApprovalManager();

            if(bypass){
                manager.approve({
                    recType:recordType,
                    recId: recordId
                });
                return;
            }

            try {

                if(manager.approveTolerance({
                    record: scriptContext.newRecord
                })){
                    return;
                }

                if(submitted) {
                    var pending = manager.evaluateRules({
                        type: recordType,
                        id: recordId
                    });

                    log.debug('Notification', pending);

                    if(pending) {
                        manager.notifyApprover({
                            id: recordId,
                            level: pending.first
                        });
                    }
                }else{
                    manager.updateDefault({
                        recType: recordType,
                        recId: recordId
                    })
                }
            } catch(e){
                log.debug('afterSubmit',e);
            }
        }

        return {beforeLoad, afterSubmit}

    });
