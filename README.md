# **Long Form Audio Testing**
This project provides a ready-to-use template for doing in-depth testing on audio voice apps serving long audio streams, such as music players, radio stations and games.

The utterances we want to test are stored inside the `input` folder in the form of a CSV file: `input/utterances.csv`.

## **Getting Setup**
### **Environment Management**
We use **dotenv** when running locally, which takes environment variables from a local `.env` file.

To set this up, just make a copy of `example.env` and name it `.env`. Replace the values inside there with the correct values for your configuration.

For running with continuous integration (such as Jenkins, Circle CI or Gitlab), these values should instead come from actual environment variables.

### **Configuration**
The environment variables store sensitive credentials.

Our `config.json` file stores information particular to how the tests should run, but of a non-sensitive nature.

An example file:
```json
{
  "fields": {
    "imageURL": "$.raw.messageBody.directives[1].payload.content.art.sources[0].url"
  },
  "metrics": "datadog",
  "sequence": ["open my audio player"]
}
```

Each of the pieces is explained below:
#### fields
Each field represents a column in the CSV file.

By default, we take these columns and treat them as expected fields in the response output from the Virtual Device.

However, in some cases, these fields are rather complicated. In that case, we can have a field with a simple name, like `imageURL`, but then we specify a JSON path expression which is used to resolve that expression on the response payload.

This way we can perform complex verification on our utterances with a nice, clean CSV file.

#### metrics
Valid values for this are `datadog`, `cloudwatch` or `none`.

This dictates where metrics on the results of the tests are sent.

#### sequence
For tests in which there are multiple steps required before we do the "official" utterance that is being tested, we can specify them here.

Typically, this would involve launching a skill before saying the specific utterance we want to test, but more complex sequences are possible.

### **Virtual Device Setup**
* Create a virtual device with our [easy-to-follow guide here](https://read.bespoken.io/end-to-end/setup/#creating-a-virtual-device).
* Add the newly created token to the `.env` file

### **DataDog Configuration**
* Create a DataDog account.
* Take the API key from the Integrations -> API section
* Add it to the `.env` file

## **Running utterance resolution tests**
These tests check whether or not the utterance names are being understood correctly by Alexa.

To run the CSV-driven tests, enter this command:
```
npm run utterances
```

This will test each utterance defined in the `utterances.csv` file. The CSV file contains the following fields:

| Column | Description |
| --- | --- |
| `utterance` | The utterance to be said to Alexa
| `expectedResponses` | One-to-many expected responses - each one is separated by a comma

For the initial entries, we are typically just looking for the name of the recipe in the response. When the tests are run, here is what will happen:  
> Bespoken Says: `get the recipe for giada chicken piccata`  

>Alexa Replies: `okay for giada chicken piccata I recommend quick chicken piccata 25 minutes to make what would you like start recipe send it to your phone or your next recipe`

This test will pass because the actual response contains the expected response from our CSV file.

## **Gitlab Configuration**
The gitlab configuration is defined by the file `.gitlab-ci.yml`. The file looks like this:
```yaml
image: node:10

cache:
  paths:
  - node_modules/

stages:
  - test

test:
  stage: test
  script:
   - npm install
   - npm run utterances
  artifacts:
    paths:
    - utterance-results.csv
    expire_in: 1 week
```

This build script runs the utterances and saves of the resulting CSV file.

## **Test Reporting**
We have setup this project to make use of a few different types of reporting to show off what is possible.

The reporting comes in these forms:
* CSV File that summarizes results of utterance tests
* Reporting via AWS Cloudwatch
* Reporting via DataDog

Each is discussed in more detail below.

### **CSV File**
The CSV File is located in the `output` folder and contains the following:

| Column | Description |
| --- | --- |
| name | The name of the receipt to ask for
| actualResponse | The actual response back from Alexa
| success | Whether or not the test was successful
| expectedResponses | The possible expected response back from the utterance

### **DataDog**
DataDog captures metrics related to how all the tests have performed. Each time we run the tests, and when `datadog` has been set as the `metric` mechanism to use in the `config.json` file, we push the result of each test to DataDog.

In this example, we are using below metrics:
- `utterance.success`
- `utterance.failure`

The metrics can be easily reported on through a DataDog Dashboard (see next section).

They also can be used to setup notifcations when certain conditions are triggered as shown below.

### **Creating A Dashboard**
DataDog makes it easy to create a Dashboard:
- Click on Dashboards, then select "New Dashboard" from the left menu
![Creating a DataDog dashboard step 1][DataDogCreatingDashboard1]
- Give the Dashboard a name and select "New Timeboard" 
![Creating a DataDog dashboard step 2][DataDogCreatingDashboard2]
- Click on "Add a graph"
- Drag the "Timeseries" widget to the rectangular area below
![Creating a DataDog dashboard step 3][DataDogCreatingDashboard3]
- Click on the JSON editor and paste below content:
  ```json
  {
    "viz": "timeseries",
    "requests": [
      {
        "q": "sum:utterance.success{*}.as_count()",
        "type": "bars",
        "style": {
          "palette": "cool",
          "type": "solid",
          "width": "normal"
        },
        "aggregator": "avg",
        "conditional_formats": []
      },
      {
        "q": "sum:utterance.failure{*}.as_count()",
        "type": "bars",
        "style": {
          "palette": "warm",
          "type": "solid",
          "width": "normal"
        }
      }
    ],
    "autoscale": true
  }
  ```
- Give your graphic a title and click on the "Done" button

### **Creating Alarms**
DataDog makes it easy to setup alarms, let's see how:
- Go to Monitors on the left menu and select "New Monitor"
![Creating a DataDog alarm step 1][DataDogCreatingAlarm1]
- Select **Import** as the "monitor type"
![Creating a DataDog alarm step 2][DataDogCreatingAlarm2]
- Paste below content in the monitor definition area:
  ```json
  {
    "name": "Long audio test failed",
    "type": "metric alert",
    "query": "sum(last_1h):sum:utterance.failure{job:show-tests}.as_count() >= 1",
    "message": "Please review test results and take action. @all",
    "tags": [],
    "options": {
      "notify_audit": true,
      "locked": false,
      "timeout_h": 0,
      "new_host_delay": 300,
      "require_full_window": false,
      "notify_no_data": false,
      "renotify_interval": "0",
      "escalation_message": "",
      "no_data_timeframe": null,
      "include_tags": true,
      "thresholds": {
        "critical": 1
      }
    }
  }
  ```
- Click on the "Save" button

## Additional Topics
* Working With Circle CI - TBC
* Working With CloudWatch - TBC
* Working With PagerDuty - TBC

[DataDogCreatingDashboard1]: ./images/DataDogCreatingDashboard1.png "Creating a DataDog dashboard step 1"
[DataDogCreatingDashboard2]: ./images/DataDogCreatingDashboard2.png "Creating a DataDog dashboard step 2"
[DataDogCreatingDashboard3]: ./images/DataDogCreatingDashboard3.png "Creating a DataDog dashboard step 3"
[DataDogCreatingAlarm1]: ./images/DataDogCreatingAlarm1.png "Creating a DataDog alarm step 1"
[DataDogCreatingAlarm2]: ./images/DataDogCreatingAlarm2.png "Creating a DataDog alarm step 2"