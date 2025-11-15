new SchedulerPro({
    appendTo: 'preview-container',
    height: '100%',
    
    columns: [
        {
            type: 'template',
            text: 'Employee',
            field: 'name',
            width: 200,
            template: ({ record }) => `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${record.image}" alt="${record.name}" 
                         style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                    <span>${record.name}</span>
                </div>
            `
        },
        {
            text: 'Role',
            field: 'roleId',
            width: 150,
            renderer: ({ record, grid }) => {
                const role = data.roles.find(r => r.id === record.roleId);
                return role ? role.name : '';
            },
            editor: {
                type: 'combo',
                items: data.roles,
                valueField: 'id',
                displayField: 'name',
                editable: false
            }
        }
    ],
    
    resources: data.employees,
    events: data.tasks,

    startDate: new Date(2024, 0, 1),
    endDate: new Date(2024, 0, 31),

    viewPreset: 'weekAndDayLetter',

    eventStyle: 'colored',
    eventColor: 'blue',

    features: {
        group: {
            field: 'roleId',
            renderer: ({ groupRowFor }) => {
                const role = data.roles.find(r => r.id === groupRowFor);
                return role ? role.name : `Role ${groupRowFor}`;
            }
        }
    }
});