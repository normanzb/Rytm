// # APIs and Annotation

// ## Multiple environment support
// Rytm supports multiply JavaScript environment including:

;(function(name, factory){
    var Rytm = factory(this);

    if (this.require && this.require.amd && this.define){
        // * AMD loader such as requirejs or curl: 
        // `require('path/to/rytm', callback);`
        this.define(Rytm);
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

    /* no operation func */
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
            return new (Rytm.bind.apply(Rytm, null, arguments))();
        }
    
        this.steps = [this._createNode(function(){
            // * The "head node" simply redirect the calls to next step
            this._go.apply(this, arguments);
        })];
        this.cursor = this.steps[0];
        
        // * Creates `go()`, which wraps `_go()`, make sure the context of `go()` is always current
        //   instance
        this.go = this._go.bind(this);
        this.defer = this.defer.bind(this);
        this.wait = this.wait.bind(this);

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

    p._inNextCallContext = false;

    // ## _createNode
    // 
    // A private method which not supposed to be used externally,
    // it creates a node which can be used in the task sequence.
    // ### Schema
    //      {
    //          // the actual 'task function' in current task
    //          callback: actuallTaskFunc,
    //          // the reference to next node in sequence
    //          next: nextNode,
    //          // An array that stores callback which returned 
    //          // by `all()`
    //          lastCalls: [],
    //          // ticked = true means execution of current task is done
    //          // and it is safe to advance to next task
    //          ticked: false
    //      }
	p._createNode = function(callback, next){
		if (next === undef){
			next = null;
		}
		var ret = {callback: callback, next: next, nextWrapper: null};
		return ret;
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
    		var stepStruct = this._createNode(callback);
    		this.steps[this.steps.length - 1].next = stepStruct;
    		this.steps.push(stepStruct);
    		
            // * Once current Rytm instance executed
            //   and after the execution of current instance
            //   there are newly added tasks, go() will start
            //   from previous stop point and work through the 
            //   newly added task exclusively
    		if (this.cursor == null){
    			this.cursor = stepStruct;
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
		
		var callback;

        // * _go() will check if we are in a nested `next()` calling context
        //  by visiting _inNextCallContext
        //  if we are, we will have to skip same step because they might already
        //  be called. 
        while (this._inNextCallContext > 0){
            this._inNextCallContext--;
            if (this.cursor.next){
                this.cursor = this.cursor.next;
            }
            else{
                throw "Rytm: Strangely we are in a nested context "
                    "but there is no cursor.next available, must be a bug.";
            }
        }
		
		if (this.cursor == null){
			return this;
		}
		
		callback = this.cursor.callback;

		// * `_go()` will internally setup/normalize the parameters 
		this.cursor.lastCalls = [];
		
		if (callback == null){
			return this;
		}
		
		//   and then advance to next
		this.cursor = this.cursor.next;

		var result = callback.apply(this, arguments);

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
    // this is useful when you want to leave the working idle so runtime
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

	p.once = function(){
		var cur = this.cursor,
			go = this.go,
			scope = this;

		return function(){
			if (cur != scope.cursor){
				return;
			}

			go.apply(scope, arguments);
		};
	};

    // ## all
    // Return a new callback each time `all()` is called, will go to next step 
    // once all returned callbacks are called
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

    p.all = function(){
        var cur = this.cursor,
            go = this.go;

        if (!cur){
        	// * If all tasks are executed and then `all()` was called, 
            //   it will return an `noop`
        	return noop;
        }

        // * Internally use `lastCalls[]` to store 'generated callback'.
        if (!cur.lastCalls){
            cur.lastCalls = [];
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
        if (cur.ticked == null){
            cur.ticked = false;
            setTimeout(function(){
                cur.ticked = true;
            }, 0)
        }

        var ret = function(){
            var scope = this,
                args = arguments;
            
            if (!cur.ticked){
                setTimeout(function(){
                    return ret.apply(scope, args);
                }, 0);

                return null;
            }

            var l = cur.lastCalls.length;
            while(l--){
                if (cur.lastCalls[l] == ret){
                    cur.lastCalls.splice(l, 1);
                    if (cur.lastCalls.length <= 0){
                        go();
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
    // The difference between `next` and`go` is:
    // once `go` gets called, we will immediately advance the internal cursor to next step
    // so if the `go` gets called multiple time, your tasks in sequence will be 
    // consumed faster then expected.
    // `next()` will make sure that the 'cursor advancing' actually is done in the `go()` 
    // call of the next task. 
    //
    // ### Tips and Annotation
    p.next = function(){
        var cur = this.cursor,
            go = this.go, result;
        
        if (cur && cur.callback){
            // * Private member _inNextCallContext indicates how many level of nested next() is called
            //   correspondingly, later call to `go()` will have to skip _inNextCallContext
            //   tasks.
            this._inNextCallContext++;

            result = cur.callback.apply(this, arguments);

            // * `next` makes sure the behavior is the same as `go` when the task has return value.
            //   Return anything other than undefine will cause advancing to next task immediately
            if (result !== undef){
                this.go();
            }

            this._inNextCallContext--;
        }

        return result;

    };


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
	
	return Rytm;
});
