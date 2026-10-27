from app.algorithms import nn_module2_examples as algo
from app.schemas.nn_module2_examples import (
    BackpropNetworkOut,
    BackpropStepRequest,
    BackpropStepResponse,
    BackpropTrainRequest,
    BackpropTrainResponse,
    EmailClassificationRequest,
    EmailClassificationResponse,
)


def run_email_classification(payload: EmailClassificationRequest) -> EmailClassificationResponse:
    result = algo.classify_email(
        payload.inputs, payload.h1_weights, payload.h2_weights, payload.output_weights
    )
    return EmailClassificationResponse(**result.__dict__)


def _network_from_in(net_in) -> algo.BackpropNetwork:
    return algo.BackpropNetwork(w13=net_in.w13, w23=net_in.w23, w14=net_in.w14, w24=net_in.w24, w35=net_in.w35, w45=net_in.w45)


def _step_to_response(step: algo.BackpropStepResult) -> BackpropStepResponse:
    return BackpropStepResponse(
        a3=step.a3, y3=step.y3, a4=step.a4, y4=step.y4, a5=step.a5, y5=step.y5,
        error=step.error, delta5=step.delta5, delta3=step.delta3, delta4=step.delta4,
        updated_network=BackpropNetworkOut(**step.updated_network.as_dict()),
        steps=step.steps,
    )


def run_backprop_step(payload: BackpropStepRequest) -> BackpropStepResponse:
    network = _network_from_in(payload.network)
    result = algo.backprop_step(payload.x1, payload.x2, payload.target, payload.learning_rate, network)
    return _step_to_response(result)


def run_backprop_train(payload: BackpropTrainRequest) -> BackpropTrainResponse:
    network = _network_from_in(payload.network)
    result = algo.backprop_train(
        payload.x1, payload.x2, payload.target, payload.learning_rate, network, payload.num_steps
    )
    return BackpropTrainResponse(
        history=[_step_to_response(s) for s in result.history],
        final_network=BackpropNetworkOut(**result.final_network.as_dict()),
        final_output=result.final_output,
        final_error=result.final_error,
    )
