# This is the WonderQ simple queue.

This is an implementation of a very simple message queue. It has only 3 commands:

 - **Enqueue:** Puts a new element in the queue.
 - **Dequeue:** Returns the first available element from the queue.
 - **NotifyDone:** Notifies the queue that the consumer has finished processing the element.

Being a very basic queue, it has several limitations:

 - **No message persistence:** The queue only runs in memory, it has no provisions to be able to queue messages to disk
 - **Best-effort *everything*:** The queue is best effort, and while it tries to minimize problems caused by race conditions in high volume applications, there is no guarantee that such conditions will never happen. Some messages may be delivered twice.
 - **No security:** There are no features to add authentication or authorization of any kind. All API endpoints are public.
 - **JSON only:** The data is delivered in the JSON format both ways. If binary data is required, it will need to be encoded to JSON first (for example, with base64).

## Design considerations

The queue was designed to be **memory-only** and **best effort**. It can only run in a single server, and the focus has been performance, rather than guarantee data delivery. The queue will try to avoid problems, and notify consumers about potential duplicate delivery of messages, but makes no guarantees. At the core, there is no mutex or locking, as this would introduce complexity and overhead which may not be required for the application. 

The service runs a single queue. There is no partitioning of any kind. If multiple domains are required, multiple instances of the queue will need to be created (and run in different processes). This is actually a *feature* because (as the following paragraph will explain) it will allow multiple instances to be managed by the operating system threading and scheduling.

The server runs in a single CPU core. While it is possible to fire up multiple Express worker processes and increase CPU utilization, the complexity required to make the actual queue multithread-friendly is beyond the target scope of this application. In fact, the overhead from Express and the worker threads, mutexing, and other considerations required for a very high performance system, will probably be higher than the actual queue itself. A wise design decision would be to use a specific queuing system, such as RabbitMQ or Amazon SQS.

 

## TODO

 - Add memory limits
 - Add authentication/authorization: a JWT token could be used to protect the API endpoints.
