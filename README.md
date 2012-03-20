#Rytm

Rytm is a asynchronous flow control library that turns nested chaos into linear, readable
sweetness.

# The Reasons for Rytm

Says we are going to:

1. Wait for user input.
2. Send user input to server, and wait for response.
3. Slide down the message box and in the meantime, fade in an image.
4. After above animation done, fade in the message which retrieved in step #2.

To get above jobs done, inexperienced JavaScript developer usually generate code like
this:

    // hook on the input event and waiting for 'enter'
    txtUserInput.bind('input', function(evt){
        if (evt.keyCode == 13){

            // post the user input to server and wait for response.
            $.post('/api', txtUserInput.val(), function(data){

                var msg = data.message, animationCount = 0;

                divMsgBox.slideDown(function(){
                    animationCount++
                    checkIfAnimationDone();
                })

                imgBanner.fadeIn(function(){
                    animationCount++
                    checkIfAnimationDone();
                })

                function checkIfAnimationDone(){
                    if (animationCount >= 2){
                        divMsgInner.html(msg).fadeIn();
                    }
                }
            }
            });
        }
    });

This is a really common task in asynchronous programming world but the code result doesn't 
look good enough:

1. Too many nested blocks reduced your code readibility.
2. Hard to understand the logic, you need to trace the block by block to see what happened 
eventually.
3. Error prone.
4. The last fade-in animation must be done after the first 2 animation, writing code to check 
task status is tedious and waste of your time.

By using a flow control library such as Rytm, writing code snippet for above task can be much
safer, simpler, and productivity, and the code become more readable and compact:

    var r = new Rytm(function(){

        txtUserInput.bind('input', this.next);

    }, function(evt){

       if (evt.keyCode == 13){
           // tell Rytm to go to next step directly   
           return true;
       }

    }, function(){

       $.postMessage('/api', txtUserInput.val(), this.go);

    }, function(data){

       // pass the data to next beat
       this.nextArgs(data);
       // or :
       // this.next(this.next.bind(this, data));

       divMsgBox.slideDown(this.all());
       imgBanner.fadeIn(this.all());

     }, function(data){

        divMsgInner.html(data.msg).fadeIn();

     })
     .go();

# How to use

# Build

# Run test

To run tests in node.js, you will need to install mocha and chai first:
`npm install chai mocha -g`

And then simply hit:
`make test`

