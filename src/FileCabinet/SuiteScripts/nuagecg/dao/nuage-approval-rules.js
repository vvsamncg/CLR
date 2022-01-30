/**
 * @NApiVersion 2.1
 */
define(['N/log', 'N/record', 'N/search',
        '../const/nuage-approval-const-level'

    ],
    /**
     * @param{log} log
     * @param{record} record
     * @param{search} search
     */
    function(log, record, search, list){

        const RECORD_TYPE = 'customrecord_ng_approval_rules';
        const FIELDS = {
            ISINACTIVE: 'isinactive',
            USER: 'custrecord_ng_approval_rules_user',
            ROLE: 'custrecord_ng_approval_rules_role',
            STATE: 'custrecord_ng_approval_rules_lvl',
            SETTINGS: 'custrecord_ng_approval_rules_stg',
            BUTTON: 'custrecord_ng_approval_rules_btn_lbl',
            AMOUNT_FROM: 'custrecord_ng_approval_rule_amt_frm',
            AMOUNT_TO: 'custrecord_ng_approval_rule_amt_to',
            VENDOR: 'custrecord_ng_tbd_amt_vendor',
            PROGRAM: 'custrecord_ng_approval_rule_program',

            SETTINGS_TYPE: 'custrecord_ng_approval_setting_type',
            SETTINGS_TEMPLATE: 'custrecord_ng_approval_setting_is_email',
            SETTINGS_AUTHOR: 'custrecord_ng_approval_setting_email_aut'
        }

        function getRules(recordType){
            var rules = {
                template: null,
                author: -5
            };

            search.create({
                type: RECORD_TYPE,
                filters: [
                    ['custrecord_ng_approval_rules_stg.custrecord_ng_approval_setting_type', 'is', recordType], 'AND',
                    ['custrecord_ng_approval_rules_stg.isinactive', 'is', false], 'AND',
                    ['isinactive','is', false]
                ],
                columns:[
                    search.createColumn({name: FIELDS.USER}),
                    search.createColumn({name: FIELDS.ROLE}),
                    search.createColumn({name: FIELDS.STATE}),
                    search.createColumn({name: FIELDS.AMOUNT_FROM}),
                    search.createColumn({name: FIELDS.AMOUNT_TO}),
                    search.createColumn({name: FIELDS.VENDOR}),
                    search.createColumn({name: FIELDS.PROGRAM}),

                    search.createColumn({name: FIELDS.SETTINGS_TEMPLATE, join: FIELDS.SETTINGS})
                ]
            })
                .run()
                .getRange({start: 0, end: 1000})
                .forEach(function(result, i){
                     var template = result.getValue({
                        name: FIELDS.SETTINGS_TEMPLATE,
                        join: FIELDS.SETTINGS
                    });
                     if(template){
                         rules.template = template;
                     }

                    var author = result.getValue({
                        name: FIELDS.SETTINGS_AUTHOR,
                        join: FIELDS.SETTINGS
                    });
                    if(author){
                        rules.author = author
                    }

                    var state = result.getValue({name: FIELDS.STATE});
                    if(state == list.LEVELS.LEVEL_A){
                        var vendor = result.getValue({name: FIELDS.VENDOR});

                        rules[state] = rules[state] || {
                            approver: result.getValue({name: FIELDS.USER}),
                            vendors: {}
                        }
                        rules[state].vendors[vendor] = result.id;
                        return;
                    }

                    if(state == list.LEVELS.LEVEL_1){
                        var program = result.getValue({name: FIELDS.PROGRAM});
                        rules[state] = rules[state] || {
                            approver: result.getValue({name: FIELDS.USER}),
                            program: {}
                        }
                        rules[state].program[program] = result.id;
                        return;
                    }

                    if(state == list.LEVELS.LEVEL_2){
                        rules[state] = rules[state] || {
                            approver: result.getValue({name: FIELDS.USER}),
                            amount: []
                        }
                        rules[state].amount.push({
                            id: result.id,
                            from: result.getValue({name: FIELDS.AMOUNT_FROM}),
                            to: result.getValue({name: FIELDS.AMOUNT_TO}),
                        });
                        return;
                    }

                    if(state == list.LEVELS.FINAL){
                        rules[state] = rules[state] || {
                            approvers: result.getValue({name: FIELDS.USER}),
                            id: result.id
                        }
                    }
                });

            return rules;
        }

        return {
            getRules: getRules
        }

    });
