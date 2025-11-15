// Grid configuration
new Grid({
    height   : '100%',
    appendTo : 'preview-container',
    columns  : [
        {
            text   : 'Name',
            field  : 'name',
            flex   : 2,
            editor : {
                type     : 'textfield',
                required : true
            }
        }, {
            text  : 'Age',
            field : 'age',
            width : 100,
            type  : 'number'
        }, {
            text  : 'City',
            field : 'city',
            flex  : 1
        }, {
            text  : 'Food',
            field : 'food',
            flex  : 1
        }, {
            type  : 'color',
            text  : 'Color',
            field : 'color',
            width : 80
        }
    ],
    data : data
});
