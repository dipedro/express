const express = require('express');
const bodyParser = require("body-parser");
const cors = require('cors');
var app = express();

// Initalize Sentry (import library and instantiate)
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

Sentry.init({ 
    environment: 'development-local',
    dsn: 'https://b3a6c3b6f0574efeb7fc0af013d681c2@o530879.ingest.sentry.io/5650839',
    integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app } ),
    ],
/*     debug: true,
    beforeSend(event) {
        console.log(event);
        return event;
      }, */
    // Sample rate can be set as a decimal between 0 and 1
    // representing the percent of transactions to record
    //
    // For our example, we will collect all transactions
    tracesSampleRate: 1.0,
});

let Inventory = {
    wrench: 0,
    nails: 0,
    hammer: 1
};

let checkout = (cart) => {
    let tempInventory = Inventory;

    // check if we have enough Inventory
    cart.forEach((item) => {
        if (tempInventory[item.id] <= 0) {
            throw Error("No inventory for " + item.id);
        }
        tempInventory[item.id]--;
    });

    // update Inventory if we have enough to fulfill this order
    Inventory = tempInventory;
};

let teste = () => {
    setTimeout(() => {  }, 2500);
}

let teste2 = () => {
    setTimeout(() => {  }, 2500);
}

let teste3 = () => {
    setTimeout(() => {  }, 2500);
}

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(bodyParser.json());
app.use(cors());

app.all('*', function (req, res, next) {
    let transactionId = req.header('X-Transaction-ID'),
        sessionId = req.header("X-Session-ID"),
        order = req.body;

    if (transactionId) {
        Sentry.configureScope(scope => {
            scope.setTag("transaction_id", transactionId);
        });
    }
    if (sessionId) {
        Sentry.configureScope(scope => {
            scope.setTag("session_id", sessionId);
        });
    }
    if (order.email) {
        Sentry.configureScope(scope => {
            scope.setUser({ email: order.email });
        });
    }
    Sentry.configureScope(scope => {
        scope.setExtra("inventory", JSON.stringify(Inventory));
    });
    next();
});

app.post('/checkout', function (req, res) {
    let order = req.body;

    console.log("Processing order for: " + order.email);
    checkout(order.cart);
    res.send('Success');
});

app.get('/tracing', function (req, res) {
    // Simulate an API call that takes a random amount
    // of time and goes long
    let delay = 2500;
    Sentry.captureMessage('Custom Message');
    teste();
    teste2();
    teste3();
    setTimeout(() => { res.send('Success'); }, delay);    
});

app.get('/unhandled', function (req, res) {
    let obj = {};
    obj.doesNotExist();
});

app.get('/erro', function (req, res) {
    try {
        let obj = {};
        obj.doesNotExist();
        res.send('Success');
    } catch (error) {
        Sentry.captureException(error);
        res.status(500).send("Something broke");
    }
});

// The error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());

app.listen(process.env.PORT || 3001, function () {
    console.log('CORS-enabled web server listening on port 3001');
});
