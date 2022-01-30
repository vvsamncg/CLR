/**
 * @NApiVersion 2.1
 */
define(['N/log', 'N/record', 'N/search'],
    /**
     * @param{log} log
     * @param{record} record
     * @param{search} search
     */
    function(log, record, search){

        const RECORD_TYPE = 'customrecord_ng_approval_setting';
        const RECORD_TYPE_LINE = 'customrecord_ng_approval_setting_line';
        const FIELDS = {
            ISINACTIVE: 'isinactive',
            RECORD_TYPE: 'custrecord_ng_approval_setting_type',
            EMAIL_TEMPLATE: 'custrecord_ng_approval_setting_is_email',
            AUTHOR: 'custrecord_ng_approval_setting_email_aut',

            APPROVAL_FLD: 'custrecord_ng_approval_setting_fld',
            STATUS_APPROVE: 'custrecord_ng_approval_setting_approve',
            STATUS_REJECTED: 'custrecord_ng_approval_setting_reject',
            STATUS_DEFAULT: 'custrecord_ng_approval_setting_default'
        }
        const LINES = {
            ISINACTIVE: 'isinactive',
            SEQUENCE: 'custrecord_ng_approval_setting_line_sq',
            STATUS_FLD: 'custrecord_ng_approval_setting_line_fld',
            STATUS_ID: 'custrecord_ng_approval_setting_line_stat',
            DEFAULT: 'custrecord_ng_approval_setting_line_def',
            LEVEL: 'custrecord_ng_approval_setting_line_lvl',

            PARENT: 'custrecord_ng_approval_setting_line_stg'
        }


        function getSettings(params){
            var settings = [];
            search.create({
                type: RECORD_TYPE,
                filters: [
                    ['custrecord_ng_approval_setting_type', 'is', params.type], 'AND',
                    ['isinactive', 'is', false]
                ],
                columns:[
                    FIELDS.EMAIL_TEMPLATE,
                    FIELDS.AUTHOR,

                    FIELDS.STATUS_REJECTED,
                    FIELDS.STATUS_APPROVE,
                    FIELDS.STATUS_DEFAULT,
                    FIELDS.APPROVAL_FLD
                ]
            })
            .run()
            .getRange(0, 1000)
            .forEach(function(result){
                settings.push({
                    template: result.getValue({name: FIELDS.EMAIL_TEMPLATE}),
                    author: result.getValue({name: FIELDS.AUTHOR}),

                    status_default: result.getValue({name: FIELDS.STATUS_DEFAULT}),
                    status_approve: result.getValue({name: FIELDS.STATUS_APPROVE}),
                    status_reject: result.getValue({name: FIELDS.STATUS_REJECTED}),
                    status_fld: result.getValue({name: FIELDS.APPROVAL_FLD}),
                });
            });
            return settings;
        }

        return {
            getSettings: getSettings
        }

    });
