define(['N/log', 'N/search', 'N/record', 'N/format', 'N/render',
        './nuage-approval-instance',
        './nuage-approval-rules',
        './nuage-approval-settings',
        './nuage-approval-email',

        '../const/nuage-approval-const-level'


    ],
    function(log, search, record, format, render,
             instance,
             rules,
             settings,
             email,
             list){

    const FIELDS ={
        ENTITY: 'entity',
        ITEM: 'item',
        EXPENSE: 'expense',

        PROGRAM: 'cseg_npo_fund_p',
        TOTAL: 'total',
        TOLERANCE: 'custbody_ng_approval_tolerance',
        LIMIT: 'custbody_ng_approval_limit'
    }

    function ApprovalManager(){
        this.RULES = null;
        this.INSTANCES = null
    }

    ApprovalManager.prototype.evaluateRules = function (params){


        log.debug('evaluateRules', params);
        var transaction = record.load({
            type: params.type,
            id: params.id,
            isDynamic: true
        });

        this.INSTANCES = this._searchInstances({
            tranId:transaction.id
        });
        this.RULES = this._searchRules(transaction.type);

        var entity = transaction.getValue({
            fieldId: 'entity'
        });
        var amt = transaction.getValue({
            fieldId: 'total'
        });

        var programs = [];
        for(var i = 0; i < transaction.getLineCount({sublistId: FIELDS.ITEM}); i++){
            var line_prog = transaction.getSublistValue({
                sublistId: FIELDS.ITEM,
                fieldId: FIELDS.PROGRAM,
                line: i
            });

            if(line_prog && programs.indexOf(line_prog) == -1){
                programs.push(line_prog);
            }
        }

        for(var i = 0; i < transaction.getLineCount({sublistId: FIELDS.EXPENSE}); i++){
            var line_prog = transaction.getSublistValue({
                sublistId: FIELDS.EXPENSE,
                fieldId: FIELDS.PROGRAM,
                line: i
            });

            if(line_prog && programs.indexOf(line_prog) == -1){
                programs.push(line_prog);
            }
        }

        log.debug('programs', programs);

        var vendorRule = this._validateVendor(entity);
        var programRules = this._validateProgram(programs);
        var amountRule = this._validateAmount(amt);
        var finalRule = this.RULES[list.LEVELS.FINAL].id;

        log.debug('vendorRule', vendorRule);
        log.debug('programRules', programRules);


        var process = [];
        var valid = [];
        var index = 10;
        var count = 10;
        var current = new Date();

        if(vendorRule){
            valid.push(vendorRule);
            if(!this.INSTANCES[vendorRule]){
                process.push({
                    sequence: index,
                    level: list.LEVELS.LEVEL_A,
                    tranid: params.id,
                    ruleid: vendorRule,
                    date: current
                });
            }else{
                process.push({
                    sequence: index,
                    id: this.INSTANCES[vendorRule].id
                });
            }
            index+=count;
        }

        if(programRules){
            var ins = this.INSTANCES;
            programRules.forEach(function(pr,i){
                valid.push(pr);
                if(!ins[pr]){
                    process.push({
                        sequence: index,
                        level: list.LEVELS.LEVEL_1,
                        tranid: params.id,
                        ruleid: pr,
                        date: current
                    });
                }else{
                    process.push({
                        sequence: index,
                        id: ins[pr].id
                    });
                }
                index+=count;
            })
        }

        if(amountRule){
            var ins = this.INSTANCES;

            valid.push(amountRule);
            if(!ins[amountRule]) {
                process.push({
                    sequence: index,
                    level: list.LEVELS.LEVEL_2,
                    tranid: params.id,
                    ruleid: amountRule,
                    date: current
                });
            }else{
                process.push({
                    sequence: index,
                    id: ins[amountRule].id
                });
            }
            index+=count;
        }

        if(finalRule){
            var ins = this.INSTANCES;
            valid.push(finalRule);
            if(!ins[finalRule]) {
                process.push({
                    sequence: index,
                    level: list.LEVELS.FINAL,
                    tranid: params.id,
                    ruleid: finalRule,
                    date: current
                });
            }else{
                process.push({
                    sequence: index,
                    id: ins[finalRule].id
                });
            }
            index+=count;
        }

        for(var i in this.INSTANCES){
            if(valid.indexOf(i) == -1){
                process.push({
                    inactive: true,
                    id: this.INSTANCES[i].id
                });
            }
        }

        this._createUpdateInstances(process);
        var pending = instance.searchRulesForPending({
            tranId: params.id
        });

        log.debug('Failed-Pending', pending);

        if(pending.first != null){
            record.submitFields({
                type: transaction.type,
                id: transaction.id,
                values: {
                    custbody_ng_approval_state: pending.first
                }
            });

            pending.rules.forEach(function(r,i){
                instance.updateInstance({
                    id: r,
                    status: list.APPROVAL_STATUS.PENDING,
                    user: ''
                });
            });
        }

        return pending;
    }

    ApprovalManager.prototype.approveTolerance = function(params){
        var tolerance = this.validateTolerance({
            total: params.record.getValue({fieldId: FIELDS.TOTAL}),
            tolerance: params.record.getValue({fieldId: FIELDS.TOLERANCE}),
            limit: params.record.getValue({fieldId: FIELDS.LIMIT})
        });

        if(tolerance){
            this.approve({
                recType: params.record.type,
                recId: params.record.id
            });
        }

        return tolerance;
    }

    ApprovalManager.prototype.validateTolerance = function(params){

        log.debug('validateTolerance', params);
        if(!params.limit){
            return false;
        }

        var total = Number(params.total);
        var limit = Number(params.limit);

        if(total <= limit) return true;
        if(!params.tolerance) return false;

        var tolerance = (parseFloat(params.tolerance)/100) * params.limit;
        var value = (params.total - params.limit);

        return value <= tolerance;
    }

    ApprovalManager.prototype._createUpdateInstances = function(rules){
        rules.forEach(function(row, i){
            if(!row.id){
                instance.createInstance(row);
            }else{
                instance.updateInstance(row);
            }
        })
    }

    ApprovalManager.prototype._searchInstances = function(recordId){
        return instance.searchInstances(recordId);

        log.debug('_searchInstances', this.INSTANCES);
    }

    ApprovalManager.prototype._searchRules = function(recordType){
        return rules.getRules(recordType);
    }

    ApprovalManager.prototype._validateVendor = function(vendorId){


        if(this.RULES[list.LEVELS.LEVEL_A]){

            log.debug('-_validateVendor', this.RULES[list.LEVELS.LEVEL_A].vendors[vendorId])

           return this.RULES[list.LEVELS.LEVEL_A].vendors[vendorId];
        }
        log.debug('_validateVendor', vendorId);
        return null;
    }

    ApprovalManager.prototype._validateProgram = function(programs){
        var valid = [];

        var r = this.RULES[list.LEVELS.LEVEL_1];
        if(r) {
            programs.forEach(function (p, i) {

                if (r.program[p] &&
                        valid.indexOf(r.program[p]) == -1) {
                    valid.push(r.program[p]);
                }
            });
        }

        log.debug('_validateProgram', valid);
        return valid;
    }

    ApprovalManager.prototype._validateAmount = function(amount){
        var ruleid;
        if(this.RULES[list.LEVELS.LEVEL_2]) {
            this.RULES[list.LEVELS.LEVEL_2].amount.forEach(function(amt,i){
                var from = amt.from || 0;
                var to = amt.to || 9999999999999;

                if(amount >= from && to >= amount && !ruleid){
                    ruleid = amt.id;
                }
            })
        }

        log.debug('_validateAmount', ruleid);
        return ruleid;
    }

    ApprovalManager.prototype.notifyApprover = function(params){

            log.debug('notifyApprover', params);
            var group = instance.searchApproverEmailByLevel({
                tranId: params.id,
                status: list.APPROVAL_STATUS.PENDING,
                level: params.level
            });

            log.debug('notifyApprover.group', group);
            var template = params.template || this.RULES.template;

            if(!template){
                log.debug('notifyApprover', 'No template avalable. Please setup your email template under NG Approval Setting.');
                return;
            }

            for(var g in group){
                log.debug('notifyApprover.sending', group[g]);

                //Send notifications for next approvers
                email.sendEmail({
                    tranid: params.id,
                    template: template,
                    author: params.author || this.RULES.author,
                    recipients: group[g].approver
                });

                //Reset Logs
                instance.updateInstance({
                    id: g,
                    user:'',
                    email: 'T'
                })
            }

    }

    ApprovalManager.prototype.updateDefault = function(params){

        const ACTIVE = settings.getSettings({
            type: params.recType
        });

        if(ACTIVE && ACTIVE[0]){
            var f = {};
            f[ACTIVE[0].status_fld] = ACTIVE[0].status_default;

            record.submitFields({
                type: params.recType,
                id: params.recId,
                values: f
            })
        }
    }

    ApprovalManager.prototype.approve = function(params){
        const ACTIVE = settings.getSettings({
            type: params.recType
        });

        if(ACTIVE && ACTIVE[0]){
            var f = {};
            f[ACTIVE[0].status_fld] = ACTIVE[0].status_approve;

            record.submitFields({
                type: params.recType,
                id: params.recId,
                values: f
            })
        }
    }

    return{
        ApprovalManager: ApprovalManager
    }
})