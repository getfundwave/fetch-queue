<a name="FetchQueue"></a>

## FetchQueue
<p>The <code>FetchQueue</code> class is a utility class that allows for managing and controlling concurrent fetch requests.
It ensures that the number of active requests does not exceed a specified limit, and queues any additional requests until a slot becomes available.</p>

**Kind**: global class  

* [FetchQueue](#FetchQueue)
    * [new FetchQueue(options)](#new_FetchQueue_new)
    * [.getFetchMethod()](#FetchQueue+getFetchMethod) ⇒
    * [.getConcurrent()](#FetchQueue+getConcurrent) ⇒
    * [.setConcurrent(concurrent)](#FetchQueue+setConcurrent)
    * [.getDebug()](#FetchQueue+getDebug) ⇒
    * [.setDebug(debug)](#FetchQueue+setDebug)
    * [.pauseQueue()](#FetchQueue+pauseQueue) ⇒ <code>void</code>
    * [.startQueue([emptyQueue])](#FetchQueue+startQueue) ⇒ <code>void</code>
    * [.getQueueLength()](#FetchQueue+getQueueLength) ⇒
    * [.getActiveRequests()](#FetchQueue+getActiveRequests) ⇒

<a name="new_FetchQueue_new"></a>

### new FetchQueue(options)
<p>Initializes a new instance of the FetchQueue class with an optional FetchQueueConfig object.
If no options are provided, the default concurrent value is set to 3.</p>


| Param | Type | Description |
| --- | --- | --- |
| options | <code>FetchQueueConfig</code> | <p>The FetchQueueConfig object containing the concurrent value.</p> |

<a name="FetchQueue+getFetchMethod"></a>

### fetchQueue.getFetchMethod() ⇒
<p>Returns the custom fetch function used by the FetchQueue class to handle queuing of fetch requests.</p>

**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  
**Returns**: <p>The custom fetch function.</p>  
<a name="FetchQueue+getConcurrent"></a>

### fetchQueue.getConcurrent() ⇒
**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  
**Returns**: <p>value of concurrent property</p>  
<a name="FetchQueue+setConcurrent"></a>

### fetchQueue.setConcurrent(concurrent)
<p>set value of concurrent property</p>

**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  

| Param | Type |
| --- | --- |
| concurrent | <code>number</code> | 

<a name="FetchQueue+getDebug"></a>

### fetchQueue.getDebug() ⇒
**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  
**Returns**: <p>value of debug property</p>  
<a name="FetchQueue+setDebug"></a>

### fetchQueue.setDebug(debug)
<p>set value of debug property</p>

**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  

| Param | Type |
| --- | --- |
| debug | <code>boolean</code> | 

<a name="FetchQueue+pauseQueue"></a>

### fetchQueue.pauseQueue() ⇒ <code>void</code>
<p>Disables the queuing of fetch requests in the FetchQueue.</p>

**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  
<a name="FetchQueue+startQueue"></a>

### fetchQueue.startQueue([emptyQueue]) ⇒ <code>void</code>
<p>Enables the queuing of fetch requests in the FetchQueue.</p>

**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  

| Param | Type | Description |
| --- | --- | --- |
| [emptyQueue] | <code>boolean</code> | <p>If true, empties the queue before starting.</p> |

<a name="FetchQueue+getQueueLength"></a>

### fetchQueue.getQueueLength() ⇒
**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  
**Returns**: <p>Length of queue</p>  
<a name="FetchQueue+getActiveRequests"></a>

### fetchQueue.getActiveRequests() ⇒
**Kind**: instance method of [<code>FetchQueue</code>](#FetchQueue)  
**Returns**: <p>Number of active requests</p>  
