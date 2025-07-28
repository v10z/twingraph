# SPDX-License-Identifier: MIT-0
# Copyright (c) 2025 TwinGraph Contributors

"""
Modern ML framework components supporting JAX, PyTorch Lightning, and more.
"""

from typing import Dict, Any, Optional, List, Union, Callable
import asyncio
from abc import ABC, abstractmethod
import numpy as np
from pathlib import Path

from ...orchestration.modern_decorators import async_component, ComponentConfig
from ...core.logging import get_logger
from ...core.telemetry import trace_component

logger = get_logger(__name__)


class MLFramework(ABC):
    """Base class for ML framework integrations."""
    
    @abstractmethod
    async def train(
        self,
        model: Any,
        train_data: Any,
        val_data: Any,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Train a model."""
        pass
    
    @abstractmethod
    async def predict(
        self,
        model: Any,
        data: Any,
        config: Dict[str, Any]
    ) -> Any:
        """Run inference."""
        pass
    
    @abstractmethod
    async def save_model(
        self,
        model: Any,
        path: Path
    ) -> None:
        """Save model to disk."""
        pass
    
    @abstractmethod
    async def load_model(
        self,
        path: Path,
        config: Dict[str, Any]
    ) -> Any:
        """Load model from disk."""
        pass


class JAXFramework(MLFramework):
    """JAX framework integration with JIT compilation and device management."""
    
    def __init__(self):
        try:
            import jax
            import jax.numpy as jnp
            from jax import jit, grad, vmap
            import optax
            self.jax = jax
            self.jnp = jnp
            self.jit = jit
            self.grad = grad
            self.vmap = vmap
            self.optax = optax
        except ImportError:
            logger.warning("JAX not installed. Install with: pip install jax jaxlib optax")
            self.jax = None
    
    async def train(
        self,
        model: Any,
        train_data: Any,
        val_data: Any,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Train JAX model with JIT compilation."""
        if not self.jax:
            raise RuntimeError("JAX not available")
        
        # Extract config
        learning_rate = config.get('learning_rate', 0.001)
        epochs = config.get('epochs', 10)
        batch_size = config.get('batch_size', 32)
        
        # Initialize optimizer
        optimizer = self.optax.adam(learning_rate)
        opt_state = optimizer.init(model)
        
        # JIT compile training step
        @self.jit
        def train_step(params, opt_state, batch):
            loss, grads = self.jax.value_and_grad(
                lambda p: compute_loss(p, batch)
            )(params)
            updates, opt_state = optimizer.update(grads, opt_state)
            params = self.optax.apply_updates(params, updates)
            return params, opt_state, loss
        
        # Training loop
        train_losses = []
        val_losses = []
        
        for epoch in range(epochs):
            # Train epoch
            epoch_loss = 0.0
            for batch in get_batches(train_data, batch_size):
                model, opt_state, loss = train_step(model, opt_state, batch)
                epoch_loss += loss
            
            train_losses.append(float(epoch_loss))
            
            # Validation
            val_loss = await self._validate(model, val_data)
            val_losses.append(float(val_loss))
            
            logger.info(f"Epoch {epoch}: train_loss={epoch_loss:.4f}, val_loss={val_loss:.4f}")
        
        return {
            'model': model,
            'train_losses': train_losses,
            'val_losses': val_losses,
            'final_loss': val_losses[-1]
        }
    
    async def predict(
        self,
        model: Any,
        data: Any,
        config: Dict[str, Any]
    ) -> Any:
        """Run JAX inference with optional batching."""
        if not self.jax:
            raise RuntimeError("JAX not available")
        
        # JIT compile prediction
        predict_fn = self.jit(lambda params, x: model.apply(params, x))
        
        # Handle batching
        if config.get('batch_inference', True):
            batch_size = config.get('batch_size', 32)
            predictions = []
            
            for batch in get_batches(data, batch_size):
                batch_pred = predict_fn(model, batch)
                predictions.append(batch_pred)
            
            return self.jnp.concatenate(predictions)
        else:
            return predict_fn(model, data)
    
    async def save_model(self, model: Any, path: Path) -> None:
        """Save JAX model using pickle."""
        import pickle
        
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump(model, f)
    
    async def load_model(self, path: Path, config: Dict[str, Any]) -> Any:
        """Load JAX model."""
        import pickle
        
        with open(path, 'rb') as f:
            return pickle.load(f)
    
    async def _validate(self, model: Any, val_data: Any) -> float:
        """Validate model on validation set."""
        # Simplified validation
        return 0.1  # Placeholder


class PyTorchLightningFramework(MLFramework):
    """PyTorch Lightning integration with advanced features."""
    
    def __init__(self):
        try:
            import torch
            import pytorch_lightning as pl
            from pytorch_lightning.callbacks import (
                ModelCheckpoint, EarlyStopping, LearningRateMonitor
            )
            from pytorch_lightning.loggers import TensorBoardLogger
            self.torch = torch
            self.pl = pl
            self.callbacks = {
                'checkpoint': ModelCheckpoint,
                'early_stopping': EarlyStopping,
                'lr_monitor': LearningRateMonitor
            }
            self.TensorBoardLogger = TensorBoardLogger
        except ImportError:
            logger.warning("PyTorch Lightning not installed. Install with: pip install pytorch-lightning")
            self.pl = None
    
    async def train(
        self,
        model: Any,
        train_data: Any,
        val_data: Any,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Train PyTorch Lightning model with callbacks."""
        if not self.pl:
            raise RuntimeError("PyTorch Lightning not available")
        
        # Setup callbacks
        callbacks = []
        
        if config.get('use_checkpoints', True):
            callbacks.append(
                self.callbacks['checkpoint'](
                    monitor='val_loss',
                    save_top_k=3,
                    mode='min'
                )
            )
        
        if config.get('early_stopping', True):
            callbacks.append(
                self.callbacks['early_stopping'](
                    monitor='val_loss',
                    patience=config.get('patience', 3),
                    mode='min'
                )
            )
        
        if config.get('lr_monitoring', True):
            callbacks.append(self.callbacks['lr_monitor']())
        
        # Setup logger
        logger = None
        if config.get('use_tensorboard', True):
            logger = self.TensorBoardLogger(
                save_dir='logs',
                name=config.get('experiment_name', 'twingraph_experiment')
            )
        
        # Create trainer
        trainer = self.pl.Trainer(
            max_epochs=config.get('epochs', 10),
            accelerator=config.get('accelerator', 'auto'),
            devices=config.get('devices', 'auto'),
            callbacks=callbacks,
            logger=logger,
            enable_progress_bar=config.get('progress_bar', True),
            gradient_clip_val=config.get('gradient_clip', 1.0),
            accumulate_grad_batches=config.get('accumulate_grad_batches', 1),
            precision=config.get('precision', 32),
        )
        
        # Train model
        trainer.fit(model, train_data, val_data)
        
        # Get results
        return {
            'model': model,
            'trainer': trainer,
            'checkpoint_path': trainer.checkpoint_callback.best_model_path if trainer.checkpoint_callback else None,
            'metrics': trainer.logged_metrics
        }
    
    async def predict(
        self,
        model: Any,
        data: Any,
        config: Dict[str, Any]
    ) -> Any:
        """Run PyTorch Lightning inference."""
        if not self.pl:
            raise RuntimeError("PyTorch Lightning not available")
        
        trainer = self.pl.Trainer(
            accelerator=config.get('accelerator', 'auto'),
            devices=config.get('devices', 'auto'),
        )
        
        predictions = trainer.predict(model, data)
        
        # Concatenate predictions
        if isinstance(predictions, list):
            return self.torch.cat(predictions)
        return predictions
    
    async def save_model(self, model: Any, path: Path) -> None:
        """Save PyTorch Lightning model."""
        path.parent.mkdir(parents=True, exist_ok=True)
        self.torch.save(model.state_dict(), path)
    
    async def load_model(self, path: Path, config: Dict[str, Any]) -> Any:
        """Load PyTorch Lightning model."""
        model_class = config.get('model_class')
        if not model_class:
            raise ValueError("model_class must be specified in config")
        
        model = model_class(**config.get('model_config', {}))
        model.load_state_dict(self.torch.load(path))
        return model


class HuggingFaceFramework(MLFramework):
    """Hugging Face Transformers integration."""
    
    def __init__(self):
        try:
            from transformers import (
                AutoModel, AutoTokenizer, AutoModelForSequenceClassification,
                Trainer, TrainingArguments, pipeline
            )
            import datasets
            self.transformers = {
                'AutoModel': AutoModel,
                'AutoTokenizer': AutoTokenizer,
                'AutoModelForSequenceClassification': AutoModelForSequenceClassification,
                'Trainer': Trainer,
                'TrainingArguments': TrainingArguments,
                'pipeline': pipeline
            }
            self.datasets = datasets
        except ImportError:
            logger.warning("Transformers not installed. Install with: pip install transformers datasets")
            self.transformers = None
    
    async def train(
        self,
        model: Any,
        train_data: Any,
        val_data: Any,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Train Hugging Face model."""
        if not self.transformers:
            raise RuntimeError("Transformers not available")
        
        # Training arguments
        training_args = self.transformers['TrainingArguments'](
            output_dir=config.get('output_dir', './results'),
            num_train_epochs=config.get('epochs', 3),
            per_device_train_batch_size=config.get('batch_size', 16),
            per_device_eval_batch_size=config.get('eval_batch_size', 16),
            warmup_steps=config.get('warmup_steps', 500),
            weight_decay=config.get('weight_decay', 0.01),
            logging_dir=config.get('logging_dir', './logs'),
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model=config.get('metric', 'eval_loss'),
            push_to_hub=config.get('push_to_hub', False),
        )
        
        # Create trainer
        trainer = self.transformers['Trainer'](
            model=model,
            args=training_args,
            train_dataset=train_data,
            eval_dataset=val_data,
            compute_metrics=config.get('compute_metrics'),
        )
        
        # Train
        train_result = trainer.train()
        
        # Evaluate
        eval_result = trainer.evaluate()
        
        return {
            'model': model,
            'trainer': trainer,
            'train_result': train_result,
            'eval_result': eval_result
        }
    
    async def predict(
        self,
        model: Any,
        data: Any,
        config: Dict[str, Any]
    ) -> Any:
        """Run Hugging Face inference."""
        if not self.transformers:
            raise RuntimeError("Transformers not available")
        
        # Use pipeline for easy inference
        task = config.get('task', 'text-classification')
        pipe = self.transformers['pipeline'](
            task=task,
            model=model,
            tokenizer=config.get('tokenizer'),
            device=config.get('device', -1)
        )
        
        return pipe(data)
    
    async def save_model(self, model: Any, path: Path) -> None:
        """Save Hugging Face model."""
        path.mkdir(parents=True, exist_ok=True)
        model.save_pretrained(path)
    
    async def load_model(self, path: Path, config: Dict[str, Any]) -> Any:
        """Load Hugging Face model."""
        model_class = config.get('model_class', self.transformers['AutoModel'])
        return model_class.from_pretrained(path)


# Pre-configured ML components

@async_component(
    platform='gpu',
    config={
        'gpu': {'type': 'nvidia-a100', 'count': 1},
        'docker_image': 'nvcr.io/nvidia/jax:latest'
    }
)
@trace_component("ml_training")
async def jax_training(
    model_config: Dict[str, Any],
    dataset_path: str,
    hyperparameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    JAX model training component with GPU acceleration.
    
    Example:
        result = await jax_training(
            model_config={'architecture': 'transformer', 'layers': 12},
            dataset_path='/data/dataset.tfrecord',
            hyperparameters={'learning_rate': 0.001, 'epochs': 100}
        )
    """
    framework = JAXFramework()
    
    # Load data
    train_data, val_data = await load_dataset(dataset_path)
    
    # Create model
    model = create_jax_model(model_config)
    
    # Train
    result = await framework.train(model, train_data, val_data, hyperparameters)
    
    # Save model
    await framework.save_model(
        result['model'],
        Path(f"models/jax_model_{datetime.now().isoformat()}.pkl")
    )
    
    return result


@async_component(
    platform='gpu',
    config={
        'gpu': {'type': 'nvidia-v100', 'count': 2},
        'docker_image': 'pytorch/pytorch:latest'
    }
)
@trace_component("ml_training")
async def lightning_training(
    model_class: str,
    data_module: Any,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    PyTorch Lightning training with multi-GPU support.
    
    Example:
        result = await lightning_training(
            model_class='ResNet50',
            data_module=ImageDataModule(batch_size=64),
            config={'epochs': 50, 'devices': 2}
        )
    """
    framework = PyTorchLightningFramework()
    
    # Import model class dynamically
    model = get_model_class(model_class)(**config.get('model_config', {}))
    
    # Train
    result = await framework.train(
        model,
        data_module.train_dataloader(),
        data_module.val_dataloader(),
        config
    )
    
    return result


@async_component(
    platform='kubernetes',
    config={
        'resources': {'cpu': '16', 'memory': '64Gi'},
        'docker_image': 'huggingface/transformers-pytorch-gpu:latest'
    }
)
async def finetune_llm(
    model_name: str,
    dataset_name: str,
    training_config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Fine-tune Hugging Face LLM on custom dataset.
    
    Example:
        result = await finetune_llm(
            model_name='meta-llama/Llama-2-7b-hf',
            dataset_name='squad',
            training_config={'epochs': 3, 'batch_size': 4}
        )
    """
    framework = HuggingFaceFramework()
    
    # Load model and tokenizer
    model = framework.transformers['AutoModelForSequenceClassification'].from_pretrained(model_name)
    tokenizer = framework.transformers['AutoTokenizer'].from_pretrained(model_name)
    
    # Load dataset
    dataset = framework.datasets.load_dataset(dataset_name)
    
    # Tokenize dataset
    def tokenize_function(examples):
        return tokenizer(examples['text'], padding=True, truncation=True)
    
    tokenized_dataset = dataset.map(tokenize_function, batched=True)
    
    # Train
    result = await framework.train(
        model,
        tokenized_dataset['train'],
        tokenized_dataset['validation'],
        training_config
    )
    
    return result


# Helper functions
def get_batches(data: Any, batch_size: int):
    """Generate batches from data."""
    # Simplified batching - would be more complex in practice
    for i in range(0, len(data), batch_size):
        yield data[i:i + batch_size]


def compute_loss(params: Any, batch: Any) -> float:
    """Compute loss for a batch."""
    # Placeholder loss function
    return 0.1


async def load_dataset(path: str) -> tuple:
    """Load dataset from path."""
    # Placeholder dataset loading
    return np.random.randn(1000, 10), np.random.randn(100, 10)


def create_jax_model(config: Dict[str, Any]) -> Any:
    """Create JAX model from config."""
    # Placeholder model creation
    return {'params': np.random.randn(100, 10)}


def get_model_class(name: str) -> type:
    """Get model class by name."""
    # Placeholder model class lookup
    class DummyModel:
        def __init__(self, **kwargs):
            pass
    return DummyModel


# Export main components
__all__ = [
    'MLFramework',
    'JAXFramework',
    'PyTorchLightningFramework',
    'HuggingFaceFramework',
    'jax_training',
    'lightning_training',
    'finetune_llm'
]