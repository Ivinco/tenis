# JSON schema to validate inbound JSON
schema = {
    "definitions": {
        "custom_field_definition": {
            "type": "object",
            "additionalProperties": {
                "type": "string"
            }
        },
        "new_alert_definition": {
            "properties": {
                "project": {"type": "string", "maxLength": 255},
                "host": {"type": "string", "maxLength": 255},
                "fired": {"type": "integer"},
                "alertName": {"type": "string", "maxLength": 1024},
                "severity": {"type": "string", "maxLength": 255},
                "msg": {"type": "string", "maxLength": 65536},
                "responsibleUser": {"type": "string", "maxLength": 1024},
                "comment": {"type": "string", "maxLength": 65536},
                "plugin_id": {"type": "string", "maxLength": 255},
                "silenced": {"type": "boolean"},
                "customFields": {"type": "object", "$ref": "#/definitions/custom_field_definition"}
            },
            "anyOf": [
                {"required": ["project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "silenced", "plugin_id"]},
                {"required": ["project", "host", "fired", "alertName", "severity", "msg", "responsibleUser", "comment", "silenced", "plugin_id", "customFields"]}
            ],
            "additionalProperties": False
        },
        "resolved_alert_definition": {
            "properties": {
                "project": {"type": "string"},
                "host": {"type": "string"},
                "alertName": {"type": "string"},
            },
            "required": ["project", "host", "alertName"],
            "additionalProperties": False
        },
        "ack_definition": {
            "properties": {
                "alertId": {"type": "string"},
            },
            "required": ["alertId"],
            "additionalProperties": False
        },
        "unsilence_definition": {
            "properties": {
                "silenceId": {"type": "string"},
            },
            "required": ["silenceId"],
            "additionalProperties": False
        },
    },


    "type": "object",  # this is for the root element
    "anyOf": [
        {"required": ["unsilence"]},
        {"required": ["update"]},
        {"required": ["reload"]},
        {"required": ["resolve"]},
        {"required": ["unack"]},
        {"required": ["ack"]},
    ],
    "properties": {
        "update": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/new_alert_definition"}
        },
        "resolve": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/resolved_alert_definition"}
        },
        "unack": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/ack_definition"}
        },
        "unsilence": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/unsilence_definition"}
        },
        "ack": {
            "type": "array",
            "maxItems": 10000,
            "items": {"$ref": "#/definitions/ack_definition"}
        },
        "reload": {
            "type": "boolean"
        },
    },
    "additionalProperties": False
}

# JSON schema to validate inbound silence JSON
silence_schema = {
    "required": [
        "project",
        "host",
        "alertName",
        "startSilence",
        "endSilence",
        "comment",
    ],
    "properties": {
        "project": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255
        },
        "host": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255
        },
        "alertName": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255
        },
        "startSilence": {
            "type": "integer"
        },
        "endSilence": {
            "type": ["integer", "null"]
        },
        "comment": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255
        }
    },
    "additionalProperties": False
}

# JSON schema to validate inbound user JSON
user_schema = {
    "anyOf": [
        {"required": ["id"]},
        {"required": ["email"]},
    ],
    "properties": {
        "id": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255
        },
        "email": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255
        },
    },
    "additionalProperties": False
}

# JSON schema to validate inbound new user JSON
user_add_schema = {
    "allOf": [
        {"required": ["email", "password"]},
        {"optional": ["id", "name", "phone", "avatar", "grouping", "timezone", "projects"]},
    ],
    "properties": {
        "id": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "email": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "password": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "name": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "phone": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "avatar": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "grouping": {
            "type": "boolean",
        },
        "timezone": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "projects": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
    },
    "additionalProperties": False
}

# JSON schema to validate inbound update user JSON
user_update_schema = {
    "allOf": [
        {"required": ["id"]},
        {"optional": ["email", "name", "phone", "avatar", "grouping", "timezone", "projects", "password"]},
    ],
    "properties": {
        "id": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "email": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "password": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "name": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "phone": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "avatar": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "grouping": {
            "type": "boolean",
        },
        "timezone": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
        "projects": {
            "type": "string",
            "pattern": "^[ -~]*$",
            "maxLength": 255,
        },
    },
    "additionalProperties": False
}

# JSON schema to validate inbound timestamp for history endpoint JSON
history_request_schema = {
    "required": ["datetime"],
    "properties": {
        "datetime": {"type": "integer"}
    }
}
