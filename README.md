# This is the WonderQ simple queue.

This is an implementation of a very simple polling message queue. It has only 3 commands:

 - **Enqueue:** Puts a new element in the queue.
 - **Dequeue:** Returns the first available element from the queue.
 - **NotifyDone:** Notifies the queue that the consumer has finished processing the element.

Being a very basic queue, it has several limitations:

 - **No message persistence:** The queue only runs in memory, it has no provisions to be able to queue messages to disk
 - **Best-effort *everything*:** The queue is best effort, and while it tries to minimize problems caused by race conditions in high volume applications, there is no guarantee that such conditions will never happen. Some messages may be delivered twice.
 - **No security:** There are no features to add authentication or authorization of any kind. All API endpoints are public.
 - **JSON only:** The data is delivered in the JSON format both ways. If binary data is required, it will need to be encoded to JSON first (for example, with base64).
 - **No multi-fanout:** All queued messages can be consumed by a single consumer. Unless there is an error, a message will always be delivered to a single consumer. There is no way to specify that multiple copies of a message should be delivered.
 - **No message types:** There is no message typing, and a consumer will always get the first available message. A consumer can't pick the type of message it wants to consume, nor the queue can decide which specific message (other than the last one in the queue) to send to which consumer.
 - **No tracking of consumers:** Once a message is handed over to a consumer, any client may call the ``notifyDone`` method and remove the element from the queue. This isn't a concern as the services uses UUIDv4 identifiers and it will be *impossible* for an attacker to guess elements from the queue. And also, because the queue has no authorization mechanism, anyone can ``dequeue`` and ``notifyDone`` as much as they want, and empty the queue anyways...
 - **No long-lived HTTP connections:** If there are no elements in the queue, it will instantly return an HTTP 204 message to any client requesting a message. There is no way of keeping a connection open to wait for new messages. 

## Design considerations

As seen by the "limitations" section, the queue has been defined more about what it's **NOT**, instead of what it *IS*.

The queue was designed to be **memory-only** and **best effort**. It can only run in a single server, and the focus has been performance, rather than guaranteed data delivery. The queue will try to avoid problems, and notify consumers about potential duplicate delivery of messages, but makes no guarantees. At the core, there is no mutex or locking, as this would introduce complexity and overhead which may not be required for the application. 

The service runs a single queue. There is no partitioning of any kind. If multiple domains are required, multiple instances of the queue will need to be created (and run in different processes). This is actually a *feature* because (as the following paragraph will explain) it will allow multiple instances to be managed by the operating system threading and scheduling.

The server runs in a single CPU core. While it is possible to fire up multiple Express worker processes and increase CPU utilization, the complexity required to make the actual queue multithread-friendly is beyond the target scope of this application. In fact, the overhead from Express and the worker threads, mutexing, and other considerations required for a very high performance system, will probably be higher than the actual queue itself. A wise design decision would be to use a specific queuing system, such as RabbitMQ or Amazon SQS.

Using a dedicated queuing system would allow for much greater flexibility. Some queuing systems offer guaranteed data delivery, and can even deliver different types of messages to different clients. Features such as group delivery, QoS, partitioning, data type flexibility and much more, will be better suited by other solutions.

Lastly, since this is a **polling** queue, it's almost *by definition* not really designed to be an high-performance solution. Having hundreds of consumers constantly polling the queue for more work will significantly degrade performance. A workaround for this would be to implement WebSocket-based communication for the queue, following the pub-sub pattern. This would certainly increase performance in an environment where there are potentially thousands of consumers, to avoid polling. This kind of solution should be relatively easy to add to the HTTP API.

### Who is this product for, then?

This solution is by no means useless. It will perform decently, and it's very easy to integrate. As Docker service, it can be ready in seconds. No configuration is needed *because the queue itself provides none*, except for the timeout, which has a default value of 10 seconds. Under the design considerations and assumptions, this service, as limited as it is, will be *good enough* for most users.

## TODO

 - Add memory limits
 - Add authentication/authorization: a JWT token could be used to protect the API endpoints.
 - Add queue aging and expiring of old elements

 ## Configuration

 The only available configuration parameter is ``MESSAGE_TIMEOUT``, which specifies how long the queue will wait for the call to ``notifyDone`` after a client called ``dequeue``. After this period, the element will be added back to the queue. The default value, if not specified, is 10 seconds. It can be configured by the environment variable ``MESSAGE_TIMEOUT``.

 ## API Reference

 The service is exposed as an HTTP API. There are 3 API endpoints:

  - **/enqueue**, expects an HTTP POST request with a JSON body with the payload to insert. Returns a JSON body with an object containing the property ``element_id``, with the UUIDv4 ID of the inserted message.
  - **/dequeue**, expects an HTTP GET request with no parameters. If there are available elements, it will return a JSON body with an object with the properties ``element_id`` and ``payload``. If there are no elements in the queue, it will return HTTP 204. The client has, by default, 10 seconds to process the message until it's added back to the queue.
  - **/notifyDone**, expects an HTTP GET request with a ``element_id`` parameter with the ID of the message that was processed. Will return HTTP 204 if the element was successfully removed from the queue, or HTTP 404 if the element was not found. This can be due to two reasons: either the element was never in the queue to begin with, or the consumer took longer than the configured timeout and was delivered to (and processed by) another consumer. It's up to the business logic of the application to decide what to if this happens.
