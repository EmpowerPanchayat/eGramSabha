// File: backend/models/Role.js
const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    resource: {
        type: String,
        required: true
    },
    actions: {
        create: {
            type: Boolean,
            default: false
        },
        read: {
            type: Boolean,
            default: false
        },
        update: {
            type: Boolean,
            default: false
        },
        delete: {
            type: Boolean,
            default: false
        }
    }
});

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['ADMIN', 'SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST']
    },
    description: {
        type: String,
        required: true
    },
    permissions: {
        type: [permissionSchema],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
roleSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Role = mongoose.model('Role', roleSchema);

// Create default roles if they don't exist
const createDefaultRoles = async () => {
    try {
        const roles = [
            {
                name: 'ADMIN',
                description: 'System Administrator with full access',
                permissions: [
                    {
                        resource: 'panchayat',
                        actions: { create: true, read: true, update: true, delete: true }
                    },
                    {
                        resource: 'user',
                        actions: { create: true, read: true, update: true, delete: true }
                    },
                    {
                        resource: 'official',
                        actions: { create: true, read: true, update: true, delete: true }
                    },
                    {
                        resource: 'issue',
                        actions: { create: true, read: true, update: true, delete: true }
                    },
                    {
                        resource: 'ward',
                        actions: { create: true, read: true, update: true, delete: true }
                    }
                ]
            },
            {
                name: 'SECRETARY',
                description: 'Panchayat Secretary with administrative access',
                permissions: [
                    {
                        resource: 'panchayat',
                        actions: { create: false, read: true, update: true, delete: false }
                    },
                    {
                        resource: 'user',
                        actions: { create: true, read: true, update: true, delete: false }
                    },
                    {
                        resource: 'official',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'issue',
                        actions: { create: true, read: true, update: true, delete: true }
                    },
                    {
                        resource: 'ward',
                        actions: { create: true, read: true, update: true, delete: true }
                    }
                ]
            },
            {
                name: 'PRESIDENT',
                description: 'Panchayat President with oversight access',
                permissions: [
                    {
                        resource: 'panchayat',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'user',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'official',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'issue',
                        actions: { create: true, read: true, update: true, delete: false }
                    },
                    {
                        resource: 'ward',
                        actions: { create: false, read: true, update: false, delete: false }
                    }
                ]
            },
            {
                name: 'WARD_MEMBER',
                description: 'Ward Member with limited access',
                permissions: [
                    {
                        resource: 'panchayat',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'user',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'official',
                        actions: { create: false, read: false, update: false, delete: false }
                    },
                    {
                        resource: 'issue',
                        actions: { create: true, read: true, update: true, delete: false }
                    },
                    {
                        resource: 'ward',
                        actions: { create: false, read: true, update: false, delete: false }
                    }
                ]
            },
            {
                name: 'COMMITTEE_SECRETARY',
                description: 'Committee Secretary with specific access',
                permissions: [
                    {
                        resource: 'panchayat',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'user',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'official',
                        actions: { create: false, read: false, update: false, delete: false }
                    },
                    {
                        resource: 'issue',
                        actions: { create: true, read: true, update: true, delete: false }
                    },
                    {
                        resource: 'ward',
                        actions: { create: false, read: true, update: false, delete: false }
                    }
                ]
            },
            {
                name: 'GUEST',
                description: 'Guest (Police, DM, etc.) with view-only access',
                permissions: [
                    {
                        resource: 'panchayat',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'user',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'official',
                        actions: { create: false, read: false, update: false, delete: false }
                    },
                    {
                        resource: 'issue',
                        actions: { create: false, read: true, update: false, delete: false }
                    },
                    {
                        resource: 'ward',
                        actions: { create: false, read: true, update: false, delete: false }
                    }
                ]
            }
        ];

        for (const role of roles) {
            await Role.findOneAndUpdate(
                { name: role.name },
                role,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        console.log('Default roles created/updated successfully');
    } catch (error) {
        console.error('Error creating default roles:', error);
    }
};

// Export the model and the function to create default roles
module.exports = {
    Role,
    createDefaultRoles
};