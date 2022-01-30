/**
 * @NApiVersion 2.1
 */
define(['N/render', 'N/email'], function(render, email){
    function sendEmail(params){

        log.debug('sendEmail', params);

        var template = render.mergeEmail({
            templateId: params.template,
            transactionId: Number(params.tranid)
        });
        email.send({
            author: params.author,
            recipients: params.recipients,
            body: template.body,
            subject: template.subject,
            relatedRecords: {
                transactionId: params.tranid
            }
        });
    }

    return {
        sendEmail:sendEmail
    }
})