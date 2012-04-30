// # APIs and Annotation

// ## Multiple environment support
// Rytm supports multiply JavaScript environment including:

;(function(name, factory){
    var Rytm = factory(this);

    if (this.require && this.define && this.define.amd){
        // * AMD loader such as requirejs or curl: 
        // `require('path/to/rytm', callback);`
        define(function(){
            return Rytm;
        });
    }
    else if (typeof exports != 'undefined'　&& typeof module != 'undefined'){
        // * Nodejs module loading:
        //   `var Rytm = require('path/to/rytm');`
        module.exports = Rytm;
    }
    else{
        // * `Rytm` will be a global variable if its factory was ran 
        //   without AMD loader
        this[name] = Rytm;
    }

})

("Rytm", function(global, undef){
    "use strict";

    /* Shims */
    var noop;

    if (global.etui){
        noop = global.etui.noop;
    }
    else if(global.jQuery){
        noop = global.jQuery.noop;
    }
    else{
        noop = function(){};
    }

    var bind = Function.prototype.bind || (function(context) {
        var slice = Array.prototype.slice;
        var __method = this, args = slice.call(arguments);
        args.shift();
        return function wrapper() {
            if (this instanceof wrapper){
                context = this;
            }
            return __method.apply(context, args.concat(slice.call(arguments)));
        };
    });

    // ## Constructor
    //
    // Create Rytm instance and also loads the tasks
    // 
    // `var r = new Rytm(task1, task2, task3 ... )`
    //
    // ### Parameters
    // * task1-n: Tasks/callbacks which to be executed in order
    // 
    // ### Tips and Annotations
    // * Tasks can also be added later by calling `instance.beat`

    /* 
        Constructor
    */
    var Rytm = function(){

        // * You can also create new instance the 'creator' style:
        //   `var r = Rytm()`
        if (!(this instanceof Rytm)){
            return new (bind.apply(Rytm, null, arguments))();
        }
    
        this.steps = [this._createNode(function(){
            // * The "head node" simply redirect the calls to next step
            this._go.apply(this, arguments);
        })];

        // * this.cursor.value is actually shared between TaskContexts
        this.cursor = {
            value: this.steps[0]
        };
        
        // * Creates `go()`, which wraps `_go()`, make sure the context of `go()` is always current
        //   instance
        this.go = bind.call(this._go, this);
        this.defer = bind.call(this.defer, this);
        this.wait = bind.call(this.wait, this);

        // * Constructor will automatically load callbacks which passed in constructor as 
        //   tasks
        loadSteps.call(this, arguments);
        
    };
    

    /*
        @private loads steps from arguments
    */
    function loadSteps(args){

        for(var i = 0, l = args.length; i < l; i++){
            var cur = args[i];

            if (typeof cur != "function"){
                continue;
            }

            this.beat(cur);
        }
    }

	var p = Rytm.prototype;

    p._inNextCallContext = 0;

    // ## _createNode
    // 
    // A private method which not supposed to be used externally,
    // it creates a node which can be used in the task sequence.
    // ### Schema
    //      {
    //          // callback - the actual 'task function' in current task
    //          callback: actuallTaskFunc,
    //          // next - the reference to next node in sequence
    //          next: nextNode,
    //          // prev - the reference to prev node
    //          prev: prevNode
    //          // lastCalls - An array that stores callback which returned 
    //          // by `all()`
    //          lastCalls: [],
    //          // ticked - true means execution of current task is done
    //          // and it is safe to advance to next task
    //          ticked: false
    //          // went - true to means the cursor advancing is already done
    //          // and do not do it again.
    //      }
	p._createNode = function(callback, next){
		if (next === undef){
			next = null;
		}
		var ret = {
            callback: callback, 
            next: next, 
            prev: null,
            lastCalls: [],
            args: [],
            ticked: false, 
            went: false
        };
		return ret;
	};

    // ## current
    //
    // Get current task node
    //
    // ### Tips and Annotations
    // 
    p.current = function(){

        // * It will check if we are in TaskContext, if we are,
        //   the cursor is locked, it will return the locked cursor.
        if (this._current){
            return this._current;
        }

        if (this.cursor.value){
            return this.cursor.value.prev;
        }

        return this.steps[this.steps.length - 1];
    };

	// ## beat
    // 
    // Add a callback to the execution sequence
    //
    // ### Parameters
    // * callback: The task/callback to be added
    // 
    // ### Tips and Annotations
    //
	p.beat = function(callback){
        if (arguments.length > 1){
            loadSteps.call(this, arguments);
        }
        else{
    		var stepStruct = this._createNode(callback),
                lastStep = this.steps[this.steps.length - 1];

            stepStruct.prev = lastStep;
    		lastStep.next = stepStruct;
    		this.steps.push(stepStruct);
    		
            // * Once current Rytm instance executed
            //   and after the execution of current instance
            //   there are newly added tasks, go() will start
            //   from previous stop point and work through the 
            //   newly added task exclusively
    		if (this.cursor.value == null){
    			this.cursor.value = stepStruct;
    		}
        }
		
		return this;
	};

    // ## step
    // 
    // An alias of `beat` for backward compatibility.
    //
    p.step = p.beat;

    // ## wait
    //
    // When called, a built-in step will be added to the sequence for pausing
    // a specified millisecond, and pass the arguments to next task.
    // 
    // * wait: Specifiy the millisecond to wait.
	p.wait = function(timeout){
		var s = this;

		s.step(function(){
            var args = arguments;

			s.defer(timeout, args);
		});
		
		return this;
	};

    // ## go
    // 
    // A wrapper of `_go()` with bounded context. You can feel free to
    // call `go` or pass `go` to any async function as a callback method without
    // worrying the changing of context.
    // 
    // ### Usage
    //     function asyncCall(callback){
    //         setTimeout(function(){
    //             callback.call({});
    //         }, 0)
    //     }
    //
    //     (new Rytm(function(){
    //         // no worry, simply pass it to anything you want
    //         asyncCall(this.go);
    //     })).go();

	// ## _go
    //
    // When called, execute the next step immediately (context-binding-free).
    //
    // ### Tips and Annotations
	p._go = function(){
		
		var callback, ctx, current, contextualScope = this;

        // * `go()` can force `this` points to the instance of Rytm,
        //   so in most case we don't have to check this._instance.
        if (this._instance){
            contextualScope = this._instance;
        }

        // * _go() will check if we are in a nested `next()` calling context
        //  by visiting _inNextCallContext
        //  if we are, we will have to skip same step because they might already
        //  be called. 

        while (contextualScope._inNextCallContext > 0){
            
            contextualScope._inNextCallContext--;

            if (this.cursor.value.prev){
                this.cursor.value.prev.went = true;
            }
            this.cursor.value.went = true;
            if (this.cursor.value.next){
                this.cursor.value = this.cursor.value.next;
            }
            else{
                throw "Rytm: Strangely we are in a nested context "
                    "but there is no cursor.next available, must be a bug.";
            }
        }
		
		if (this.cursor.value == null){
			return this;
		}
		
		callback = this.cursor.value.callback;

        /* TODO: tick cursor here */
		
		if (callback == null){
			return this;
		}

        current = contextualScope.current();

        if (current){
            current.went = true;
        }

        if (this instanceof TaskContext){
            ctx = createTaskContext(this._instance);
        }
        else{
            ctx = createTaskContext(this);
        }

        //   and then advance to next
        this.cursor.value = this.cursor.value.next;

		var result = callback.apply(ctx, arguments);

        // * _go() will also check if the current task has a return value
        //   if there is, then consider the result as the parameter of
        //   next task
        //   p.s. return false will also cause immediate execution of next
        //   `beat`
        if (result !== undef){
            this.go(result);
        }
		
		return this;
	};

    // ## defer
    // 
    // Execute the next task in the sequence, but delay a bit, same as 
    // appending a wait(0) between current task and next task.
    // this is useful when you want to leave the main thread idle so runtime
    // can pick some more important task to process.
    //
    // ### Parameters
    // * millisecond - Specify the millisecond to wait, default to 0;
    // * args - The arguments to pass to next task
    // ### Tips and Annotations

	p.defer = function(millisecond, args){

        var ms;

        // * If millisecond is not given, the delay millisecond will be set to 0
        if (arguments.length < 0 || 
            millisecond == null || 
            global.isNaN(millisecond)){
            ms = 0;
        }
        else{
            ms = millisecond;
        }

        // * The millisecond is optional, if the first argument is not a number, it will be 
        //   considered as arguments to the callback of next task
        if (args == null && global.isNaN(millisecond)){
            args = millisecond;
        }

        var scope = this;
		setTimeout(function(){
            scope.go.apply(scope, args);
        }, ms);

		return this;
	};

    // ## once
    // 
    // Return a new callback, once any of the returned callbacks is called,
    // go to next step and ignore the other returned callbacks.

    // ### Tips and Annotation

	p.once = function(){
		var cur = this.current(),
			go = this.go,
			scope = this;

		return function(){
            // * If we already went to following task and then 1 callback is called 
            //   we will ignore it.
            //   In order to make sure below code can safely advance to next task: 
            //      var cb = this.once();
            //      this.go();
            //      cb();
            //
            // * When once() is used with all() together, if the callback of once() is
            //   called, we advance the cursor and ignore the callbacks of all(), vise 
            //   versa
			if (cur !== scope.current() || cur.went === true){
				return;
			}

			go.apply(scope, arguments);
		};
	};

    // ## all
    // Return a new callback each time `all()` is called, will go to next step 
    // once all returned callbacks are called

    // ### Parameters
    // * key - a key to indicate the callback, later you can use this key to retrieve
    //   the parameters.
    //
    // ### Tips and Annotation
    // * It is suggested to call `all()` in the same synchronous context, if `all()`
    //   is called in a delayed asynchronous context, the 'next task' may be executed
    //   ealier then you expected.
    //
    //         var r = Rytm(function(){
    //    
    //           doAnimate(this.all());
    //    
    //           // bbaaaaaaaad! DO NOT invoke all() in a delayed call
    //           // animation may be finished before someElement gets clicked
    //           // at that time, the only one callback was returned by 'all()'
    //           // thus, next task will be executed immedately.
    //           someElement.bind('click', function(){
    //             r.all();
    //           });
    //         }, function(){
    //             blahblah();
    //         });
    //          

    p.all = function(key){
        var cur = this.current(),
            go = this.go,
            outerScope = this,
            argsIndex = cur.lastCalls.length;

        if (!cur){
        	// * If all tasks are executed and then `all()` was called, 
            //   it will return an `noop`
        	return noop;
        }

        // * If the 'returned callback' is executed within the generating 
        //   synchronous context, now Rytm will mondatorily delay the actual execution of 
        //   next task in a asynchronous context.
        //   This is to prevent a usage pitfall in old version of Rytm:
        //
        //         s.step(function(){
        //             // this will cause problem if we don't delay the execution.
        //             // Because the first 'returned callback' will be executed 
        //             // immediately after it is produced and cause we advanced to next step
        //             // before 2nd all().
        //             executeTheCallbackImmediately(s.all());
        //             executeTheCallbackImmediately(s.all());
        //         })
        //
        //   Here we tick the `cur` in an asychronous context to tell if the calling is 
        //   happened async or sync
        if (cur.ticked === false){
            setTimeout(function(){
                cur.ticked = true;
            }, 0);
        }

        var ret = function(){
            var scope = this,
                args = Array.prototype.slice.call(arguments),
                l;

            // * If all() is used with the other method, such as once(), 'first
            //    done first serv'.
            if (cur !== outerScope.current() || cur.went === true){
                cur.lastCalls = [];
                return;
            }
            
            if (!cur.ticked){
                setTimeout(function(){
                    return ret.apply(scope, args);
                }, 0);

                return null;
            }

            cur.args[argsIndex] = args;
            cur.args[argsIndex].key = key; 

            l = cur.lastCalls.length;

            while(l--){
                if (cur.lastCalls[l] == ret){
                    cur.lastCalls.splice(l, 1);
                    if (cur.lastCalls.length <= 0){
                        go.apply(this, cur.args);
                    }
                    return true;
                }
            }

            return false;
        };

        cur.lastCalls.push(ret);
    
        return ret; 
    };


    // ## next
    //
    // A reference to the next task.
    //
    // The difference between `next` and `go` is:
    // once `go` gets called, we will immediately advance the internal cursor to next step
    // so if the `go` gets called multiple time, your tasks in sequence will be 
    // consumed faster then expected.
    // `next()` will make sure that the 'cursor advancing' actually is done in the `go()` 
    // call of the next task. 
    //
    // ### Tips and Annotation
    p.next = function(){
        var cur = this.current(),
            go = this.go, result;

        // * `next()` will do nothing once `go()` gets called.
        if (cur.went){
            return;
        }
        
        if (cur.next && cur.next.callback){
            // * Private member `_inNextCallContext` indicates how many level of nested next() is called
            //   correspondingly, later call to `go()` will have to skip the number of `_inNextCallContext`
            //   tasks.
            this._instance._inNextCallContext++;

            result = cur.next.callback.apply(this, arguments);

            // * `next` makes sure the behavior is the same as `go` when the task has return value.
            //   Return anything other than undefine will cause advancing to next task immediately
            if (result !== undef){
                this.go();
            }

            if (this._instance._inNextCallContext > 0){
                this._instance._inNextCallContext--;
            }
        }

        return result;

    };

    // ## TaskContext
    // `this` in task callback actually points to an instance of TaskContext,
    // 
    function TaskContext(rytm){
        // TaskContext will make sure calls are fixed to current task.
        // For example, `next()` will always call to callback of next task even
        // when Rytm.cursor is advanced.
        this._current = rytm.cursor.value;
        this._instance = rytm;
    };

    // ## createTaskContext
    // Create and return an instance of TaskContext, set current instance.__proto__ to 
    // current instance of Rytm, so we can visit the data and method under current instance
    // of Rytm.
    function createTaskContext(rytm){
        TaskContext.prototype = rytm;
        var ret = new TaskContext(rytm);
        return ret;
    }
	
	return Rytm;
});

// ## TODO

// ### reverse
// ### bounce
// If we are at the end, reverse the sequence and go

// ### prev 
// Return prev beat

// ### index

// ### reset

// ### group

// ### data/params
//
// To hold the parameters to next beat
//
// ### tests

// ### dispose
// Release and destroy current instance (useful when trying to ignore any futher step )

// ### strict mode
// go() cannot be called multiple times or used with the methods such as next()
