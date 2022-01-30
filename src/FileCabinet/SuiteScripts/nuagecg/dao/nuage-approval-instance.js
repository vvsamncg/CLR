/**
 * @NApiVersion 2.1
 */
define(['N/log', 'N/record', 'N/search', '../const/nuage-approval-const-level'

    ],
    /**
     * @param{log} log
     * @param{record} record
     * @param{search} search
     */
    function(log, record, search, list){

        const RECORD_TYPE = 'customrecord_ng_approval_logs';
        const FIELDS = {
            INTERNAL_ID: 'internalid',
            RECORD_ID: 'custrecord_ng_approval_logs_trx',
            RULE: 'custrecord_ng_approval_logs_rule',
            STATUS: 'custrecord_ng_approval_logs_status',
            LAST_UPDATED_DATE: 'custrecord_ng_approval_logs_ldate',
            UPDATED_BY: 'custrecord_ng_approval_logs_updated_by',
            EMAIL: 'custrecord_ng_approval_logs_email',

            LEVEL: 'custrecord_ng_approval_logs_lvl',
            SEQUENCE: 'custrecord_ng_approval_logs_seq',

            USER:'custrecord_ng_approval_rules_user',

            LEVEL_BTN_LABEL: 'custrecord_ng_approval_rules_btn_lbl',
            LEVEL_REJECT_LEVELS: 'custrecord_ng_approval_level_rj_levels',

            LEVEL_TRANSITION_REJECT: 'custrecord_ng_approval_level_trn_reject',
            LEVEL_TRANSITION_APPROVE: 'custrecord_ng_approval_level_trn_approve',

            RULE_APPROVER:'custrecord_ng_approval_rules_user',
            RULE_NAME: 'name'

        }

        function createInstance(params){
            var instance = record.create({
                type: RECORD_TYPE,
                isDynamic: true
            });

            instance.setValue({
                fieldId: FIELDS.RECORD_ID,
                value: params.tranid
            });

            if(params.ruleid)
            instance.setValue({
                fieldId: FIELDS.RULE,
                value: params.ruleid
            });

            if(params.level)
            instance.setValue({
                fieldId: FIELDS.LEVEL,
                value: params.level
            });


            if(params.date)
                instance.setValue({
                    fieldId: FIELDS.LAST_UPDATED_DATE,
                    value: params.date
                });

            if(params.sequence)
                instance.setValue({
                    fieldId: FIELDS.SEQUENCE,
                    value: params.sequence
                });

            if(params.status) {
                instance.setValue({
                    fieldId: FIELDS.STATUS,
                    value: params.status
                });
            }

            instance.save({
                ignoreMandatoryFields: true
            })
        }

        function searchInstances(params){
            var instances = {
                //1: {
                //      id: '1',
                //      status: 'Completed'?
                //      user: [1,2,3]
                // }
            };

            var filters = [
                [FIELDS.RECORD_ID, 'anyof', params.tranId]
            ];
            if(params.level){
                filters.push('AND');
                filters.push([FIELDS.LEVEL, 'anyof', params.level]);
            }
            if(params.status){
                filters.push('AND');
                filters.push([FIELDS.STATUS, 'anyof', params.status]);
            }

            log.debug('Filters', filters);
            search.create({
                type: RECORD_TYPE,
                filters: filters,
                columns: [
                    search.createColumn({name: FIELDS.RULE}),
                    search.createColumn({name: FIELDS.INTERNAL_ID}),
                    search.createColumn({name: FIELDS.STATUS}),
                    search.createColumn({name: FIELDS.USER, join: FIELDS.RULE}),
                    search.createColumn({name: FIELDS.LEVEL}),
                    search.createColumn({name: FIELDS.LEVEL_BTN_LABEL, join: FIELDS.RULE})
                ]
            })
            .run()
            .getRange(0,1000)
            .forEach(function(result, i){
                var RULE = result.getValue({name: FIELDS.RULE});

                instances[RULE] = {
                    level: result.getValue({name: FIELDS.LEVEL}),
                    id: result.getValue({name: FIELDS.INTERNAL_ID}),
                    status: result.getValue({name: FIELDS.STATUS}),
                    user_approver: result.getValue({name: FIELDS.USER, join: FIELDS.RULE}).split(','),
                    button_label: result.getValue({name:FIELDS.LEVEL_BTN_LABEL, join: FIELDS.RULE}) || 'Approve'
                }
            });

            return instances;
        }

        function updateInstance(params){
            var fields  = {};

            if(params.inactive){
                record.delete({
                    type: RECORD_TYPE,
                    id: params.id
                })
            }

            if(params.status){
                fields[FIELDS.STATUS] = params.status
            }
            if(params.user){
                fields[FIELDS.UPDATED_BY] = params.user || ''
            }
            if(params.date){
                fields[FIELDS.LAST_UPDATED_DATE] = params.date
            }

            if(params.sequence) {
                fields[FIELDS.SEQUENCE] = params.sequence
            }

            if(params.email){
                fields[FIELDS.EMAIL] = params.email == 'T'
            }

            record.submitFields({
                type: RECORD_TYPE,
                id: params.id,
                values: fields,
                options: {
                    enablesourcing: false,
                    ignoreMandatoryFields: true,
                }
            });
        }

        function searchLevelsToNextPhase(params){
            var transition = {
                levels: null,
                next_level_reject: null
            };
            search.create({
                type: RECORD_TYPE,
                filters: [
                    [FIELDS.INTERNAL_ID, 'anyof', params.instance_id]
                ],
                columns: [
                    search.createColumn({name: FIELDS.LEVEL_REJECT_LEVELS, join: FIELDS.LEVEL}),
                    search.createColumn({name: FIELDS.LEVEL_TRANSITION_REJECT, join: FIELDS.LEVEL}),
                    //search.createColumn({name: FIELDS.LEVEL_TRANSITION_APPROVE, join: FIELDS.LEVEL}),
                ]
            })
            .run()
            .getRange(0,1000)
            .forEach(function(result, i){
                transition.levels = result.getValue({name: FIELDS.LEVEL_REJECT_LEVELS, join: FIELDS.LEVEL}) || null;
                if(transition.levels){
                    transition.levels = transition.levels.split(',');
                }
                transition.next_level_reject = result.getValue({name: FIELDS.LEVEL_TRANSITION_REJECT, join: FIELDS.LEVEL}) || null;

                if(transition.next_level_reject){
                    transition.next_level_reject = transition.next_level_reject.split(',');
                }

                //transition.next_level_approve = result.getValue({name: FIELDS.LEVEL_TRANSITION_APPROVE, join: FIELDS.LEVEL})
            });

            return transition
        }

        function searchInstancesById(params){
            var instances = [];
            search.create({
                type: RECORD_TYPE,
                filters: [
                    [FIELDS.INTERNAL_ID, 'anyof', params.id]
                ],
                columns: [
                    search.createColumn({name: FIELDS.INTERNAL_ID})
                ]
            })
            .run()
            .getRange(0,1000)
            .forEach(function(result, i){
                instances.push(result.getValue({name: FIELDS.INTERNAL_ID}));
            });

            return instances
        }

        function validateLevelStatusById(params){

           var result =  search.create({
                type: RECORD_TYPE,
                filters: [
                    [FIELDS.RECORD_ID, 'anyof', params.record_id], 'AND',
                    [FIELDS.LEVEL, 'anyof', params.level], 'AND',
                    [FIELDS.STATUS, 'anyof',
                        [list.APPROVAL_STATUS.FAILED, list.APPROVAL_STATUS.PENDING]
                    ]
                ],
                columns: [
                    search.createColumn({name: FIELDS.LEVEL})
                ]
            })
            .run()
            .getRange(0,1);

            log.debug('validateRules', result);

            return result.length == 0;

        }

        function searchRulesForPending(params){
            var rules = {
                first: null,
                rules: []
            };
            search.create({
                type: RECORD_TYPE,
                filters: [
                    [FIELDS.RECORD_ID, 'anyof', params.tranId], 'AND',
                    [FIELDS.STATUS, 'anyof',
                        [list.APPROVAL_STATUS.FAILED, list.APPROVAL_STATUS.PENDING]
                    ]
                ],
                columns: [
                    search.createColumn({name: FIELDS.SEQUENCE, sort: search.Sort.ASC}),
                    search.createColumn({name: FIELDS.LEVEL}),
                    search.createColumn({name: FIELDS.STATUS})
                ]
            })
            .run()
            .getRange(0,1000)
            .forEach(function(result, i){
                var level = result.getValue({name: FIELDS.LEVEL});
                var status = result.getValue({name: FIELDS.STATUS});

                 if(!rules.first){
                     rules.first = level;
                 }

                if(status == list.APPROVAL_STATUS.FAILED){
                    rules.rules.push(result.id);
                }

            })
            return rules;
        }

        function searchApproverEmailByLevel(params){
            var group = {};
            search.create({
                type: RECORD_TYPE,
                filters:[
                    [FIELDS.RECORD_ID, 'anyof', params.tranId], 'AND',
                    [FIELDS.STATUS, 'anyof', params.status], 'AND',
                    [FIELDS.LEVEL, 'anyof', params.level], 'AND',
                    [FIELDS.EMAIL, 'is', false]
                ],
                columns:[
                    search.createColumn({name: FIELDS.RULE_APPROVER, join: FIELDS.RULE}),
                    search.createColumn({name: FIELDS.RULE_NAME, join: FIELDS.RULE})
                ]
            })
            .run()
            .getRange(0,1000)
            .forEach(function(result){
                log.debug('Result-group', result);
                group[result.id] = {
                    name: result.getValue({name: FIELDS.RULE_APPROVER, join: FIELDS.RULE}),
                    approver: result.getValue({name: FIELDS.RULE_APPROVER, join: FIELDS.RULE}).split(',')
                }
            });

            return group;
        }

        return {
            RECORD_TYPE:RECORD_TYPE,

            createInstance: createInstance,
            updateInstance:updateInstance,
            searchInstances: searchInstances,

            searchLevelsToNextPhase:searchLevelsToNextPhase,
            searchInstancesById:searchInstancesById,
            validateLevelStatusById:validateLevelStatusById,
            searchRulesForPending:searchRulesForPending,
            searchApproverEmailByLevel:searchApproverEmailByLevel
        }

    });
