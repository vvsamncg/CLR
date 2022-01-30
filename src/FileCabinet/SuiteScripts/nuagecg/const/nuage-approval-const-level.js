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

        const LEVELS = {
            LEVEL_A: '1',
            LEVEL_1: '2',
            LEVEL_2: '3',
            FINAL: '4'
        }

        const APPROVAL_STATUS = {
            PENDING: '1',
            COMPLETED: '2',
            FAILED: '3',
            SKIPPED: '4'
        }

        const SUBMISSION_FLD = {
            TRANSACTION: 'custbody_ng_approval_submit'
        }

        const TRANSACTION_STATUS = {
            CANCELLED: 'Cancelled',
            CLOSED: 'Closed',
            OPEN: 'Open'
        }
        return {
            LEVELS: LEVELS,
            APPROVAL_STATUS: APPROVAL_STATUS,
            SUBMISSION_FLD:SUBMISSION_FLD,
            TRANSACTION_STATUS:TRANSACTION_STATUS
        }
    });
