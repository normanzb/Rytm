// # Internal and External APIs

// ## Multiple environment support
// Rytm supports multiply JavaScript environment including:

;(function(factory){
    var Rytm = factory(this);

    if (this.require){

        if (this.require.amd && this.define){
            // * AMD loader such as requirejs or curl: 
            // `require('path/to/rytm', callback);`
            this.define(Rytm);
        }
        else if (this.exports){
            // * Nodejs module loading:
            //   `var rytm = require('path/to/rytm');`
            this.exports = Rytm;
        }
    }

})

(function(global, undef){
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
    // `var r = new Rytm(beat1, beat2, beat3 ... )`
    //
    // ### Parameters
    // * beat1-n: Tasks/callbacks which to be executed in order
    // 
    // ### Tips and Annotations
    // * Tasks can also be added later by calling `instance.beat`

    /* 
        Constructor
    */
    var Rytm = function(){

        // * You can also create new instance the 'creator' style:
        //   `var r = Rytm()`
        if (this instanceof Rytm){
            return new (Rytm.bind.apply(Rytm, null, arguments))();
        }
    
        this.steps = [this._createNode(function(){
            this.next();
        })];
        this.cursor = this.steps[0];
        
        // * Wrap `go()`, make sure the context of `go()` is always current
        //   instance
        this.go = this._go.bind(this);
        this.defer = this.defer.bind(this);
        this.wait = this.wait.bind(this);

        // * Constructor will automatically load callbacks which passed in constructor as 
        //   tasks
        loadSteps(arguments);
        
    };
    

    /*
        @private loads steps from arguments
    */
    function loadSteps(args){

        for(var i = 0, l < args.length; i < l; i++){
            var cur = args[i];

            if (typeof cur != "function"){
                continue;
            }

            this.step(cur);
        }
    }

	var p = Rytm.prototype;
	p._createNode = function(callback, next){
		if (next === undef){
			next = null;
		}
		var ret = {callback: callback, next: next};
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
            loadSteps(arguments);
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
    p.step = beat;

    // ## wait
    //
    // When called, a built-in step will be added to the sequence for pausing
    // a specified millisecond
    // 
    // * wait: Specifiy the millisecond to wait.
	p.wait = function(timeout){
		var s = this;

		s.step(function(){
			setTimeout(s.go, timeout);
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
    // When called, execute the next step immediately. (context-binding-free)
    //
    // ### Tips and Annotations
	p._go = function(){
		
		var callback;
		
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
        if (result !== undefined){
            this.go(result);
        }
		
		return this;
	};

    // ## defer
    // 
    // Execute the next task in the sequence, same as appending a wait(0) between 
    // current task and next task

	p.defer = function(){
		setTimeout(this.go, 0);
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

			go();
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

    //     var r = Rytm(function(){
    //
    //         doAnimate(this.all());
    //
    //         // bbaaaaaaaad! DO NOT invoke all() in a delayed call
    //         // animation may be finished before someElement gets clicked
    //         // at that time, the only one callback was returned by 'all()'
    //         // thus, next task will be executed immedately.
    //         someElement.bind('click', function(){
    //             r.all();
    //         });
    //     }, function(){
    //         blahblah();
    //     });

    p.all = function(){
        var cur = this.cursor,
            go = this.go;

        if (!cur){
        	// * If all tasks are executed and then `all()` was called, 
            //   it will return an `noop`
        	return noop;
        }

        if (!cur.lastCalls){
            cur.lastCalls = [];
        }
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
                // * If the 'returned callback' is executed within the generating 
                //   synchronous context, now Rytm will mondatorily delay the actual execution of 
                //   next task in a asynchronous context.
                //   This is to prevent a usage pitfall in old version of Rytm:
                //     s.step(function(){
                //         // this will cause problem if we don't delay the execution.
                //         // Because the first 'returned callback' will be executed 
                //         // immediately after it is produced and cause we advanced to next step
                //         // before 2nd `all()`.
                //         executeTheCallbackImmediately(s.all());
                //         executeTheCallbackImmediately(s.all());
                //     })
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


// ## TODO

// ### reverse
// ### bounce
// If we are at the end, reverse the sequence and go

// ### next
// Return next beat, next should be a getter/setter that allow

// ### prev 
// Return prev beat

// ### group

// ### data/params
// To hold the parameters to next beat
// ### tests
	
	return Rytm;
});
