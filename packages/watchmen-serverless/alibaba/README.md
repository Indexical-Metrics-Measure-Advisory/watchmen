# Alibaba Function Compute
OSS is seamlessly integrated with Function Compute by using OSS event triggers. 
You can write functions and trigger the functions by using OSS events. 
When OSS captures an event of a specified type, the event triggers the execution of the corresponding function. 

About the detail information, please refer to [the official document](https://www.alibabacloud.com/help/en/function-compute)


# Notes

## lifecycle of the function

FC have the vCPU freeze function. During the freeze, the instance can't get the vCPU. so they can't keep the heartbeat with the worker id. 
But these instance will coming back when the request need more instances. In this scenario, the worker id will be conflict. 
So we need do some adjustment to avoid this situation.

1. Increase heartbeat timeout to 30 minutes. 
   Generally, the vCPU freeze will last for 3 to 4 minutes. So we can increase heartbeat timeout to avoid the lost of worker id.
   
2. Use preStop to force the worker id release when the function really stop.
   FC provide the preStop webhook to let us do some work before stop. So we can use this to release worker id.
   

## Initialize of the worker id
FC runtime environment is different with the normal application environment. Some initial processing like "register worker id" should be
run in the start of FC instance, and only need once. "worker id" should be the scope of instance. 

The "index.handler" method will invoke by every request. if we put the "worker id initialization" in the "index.handler", will trigger a lot of competition. 

So these processing should move in "index.initialize", which is FC provide the another webhook to guarantee invoke when the FC start, and only once.
